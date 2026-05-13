CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_payment record;
  payment_email text;
  paid_tier public.plan_tier := 'premium'::public.plan_tier;
  paid_period_days integer := 30;
  paid_coins integer := 0;
  raw_plan_key text := null;
  paid_plan_key text := null;
  paid_period text := null;
  paid_until_at timestamptz;
  updated_payment_metadata jsonb;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', 'talent') = 'recruiter' THEN
    INSERT INTO public.recruiter_profiles (user_id, email, contact_name, company_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'contact_name', NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company_name', '')
    );
  ELSE
    payment_email := lower(COALESCE(NEW.email, ''));

    SELECT rp.*
    INTO matched_payment
    FROM public.recruiter_payments rp
    WHERE rp.purpose = 'talent_membership'
      AND rp.status = 'success'
      AND rp.user_id IS NULL
      AND lower(COALESCE(rp.guest_email, rp.metadata->>'guest_email', '')) = payment_email
    ORDER BY rp.paid_at DESC NULLS LAST, rp.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF matched_payment.id IS NOT NULL THEN
      paid_tier := CASE matched_payment.metadata->>'plan_tier'
        WHEN 'standard' THEN 'standard'::public.plan_tier
        WHEN 'premium' THEN 'premium'::public.plan_tier
        ELSE 'premium'::public.plan_tier
      END;
      paid_period_days := CASE
        WHEN COALESCE(matched_payment.metadata->>'period_days', '') ~ '^\d+$'
          THEN GREATEST((matched_payment.metadata->>'period_days')::integer, 1)
        ELSE 30
      END;
      paid_coins := CASE
        WHEN COALESCE(matched_payment.metadata->>'coins', '') ~ '^\d+$'
          THEN GREATEST((matched_payment.metadata->>'coins')::integer, 0)
        ELSE 0
      END;
      raw_plan_key := NULLIF(matched_payment.metadata->>'plan_key', '');
      paid_plan_key := CASE raw_plan_key
        WHEN 'starter' THEN 'monthly'
        WHEN 'standard' THEN 'monthly'
        WHEN 'pro' THEN 'quarterly'
        WHEN 'premium' THEN 'quarterly'
        WHEN 'trial' THEN 'monthly'
        WHEN 'monthly' THEN 'monthly'
        WHEN 'quarterly' THEN 'quarterly'
        WHEN 'yearly' THEN 'yearly'
        ELSE null
      END;
      paid_period := NULLIF(matched_payment.metadata->>'period', '');
      paid_until_at := now() + make_interval(days => paid_period_days);

      INSERT INTO public.profiles (
        user_id,
        email,
        full_name,
        tokens_remaining,
        plan_tier,
        paid_until,
        paid_from,
        last_monthly_grant,
        plan_key,
        billing_cycle,
        trial_used
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', matched_payment.metadata->>'guest_full_name', matched_payment.metadata->>'full_name', ''),
        GREATEST(5, paid_coins),
        paid_tier,
        paid_until_at,
        COALESCE(matched_payment.paid_at, now()),
        CURRENT_DATE,
        paid_plan_key,
        CASE WHEN paid_period IN ('monthly', 'quarterly', 'yearly') THEN paid_period ELSE null END,
        COALESCE(raw_plan_key = 'trial', false)
      );

      updated_payment_metadata := COALESCE(matched_payment.metadata, '{}'::jsonb)
        || jsonb_build_object('applied_to_user', NEW.id::text, 'applied_at', now());

      UPDATE public.recruiter_payments
      SET user_id = NEW.id,
          guest_email = NULL,
          metadata = updated_payment_metadata
      WHERE id = matched_payment.id;

      INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount)
      VALUES (NEW.id, date_trunc('month', CURRENT_DATE)::date, paid_tier::text, paid_coins)
      ON CONFLICT (user_id, period_month) DO NOTHING;
    ELSE
      INSERT INTO public.profiles (user_id, email, full_name, tokens_remaining)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 5);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

WITH latest_paid AS (
  SELECT DISTINCT ON (p.user_id)
    p.user_id,
    rp.id AS payment_id,
    rp.metadata,
    rp.paid_at
  FROM public.profiles p
  JOIN public.recruiter_payments rp
    ON rp.purpose = 'talent_membership'
   AND rp.status = 'success'
   AND (rp.user_id IS NULL OR rp.user_id = p.user_id)
   AND lower(COALESCE(rp.guest_email, rp.metadata->>'guest_email', '')) = lower(COALESCE(p.email, ''))
  WHERE COALESCE(p.plan_tier, 'free'::public.plan_tier) = 'free'::public.plan_tier
     OR p.paid_until IS NULL
     OR p.paid_until <= now()
  ORDER BY p.user_id, rp.paid_at DESC NULLS LAST, rp.created_at DESC
), repaired_profiles AS (
  UPDATE public.profiles p
  SET plan_tier = CASE latest_paid.metadata->>'plan_tier'
        WHEN 'standard' THEN 'standard'::public.plan_tier
        WHEN 'premium' THEN 'premium'::public.plan_tier
        ELSE 'premium'::public.plan_tier
      END,
      paid_until = now() + make_interval(days => CASE
        WHEN COALESCE(latest_paid.metadata->>'period_days', '') ~ '^\d+$'
          THEN GREATEST((latest_paid.metadata->>'period_days')::integer, 1)
        ELSE 30
      END),
      paid_from = COALESCE(latest_paid.paid_at, now()),
      tokens_remaining = GREATEST(
        COALESCE(p.tokens_remaining, 0),
        CASE
          WHEN COALESCE(latest_paid.metadata->>'coins', '') ~ '^\d+$'
            THEN GREATEST((latest_paid.metadata->>'coins')::integer, 0)
          ELSE 0
        END
      ),
      last_monthly_grant = CURRENT_DATE,
      plan_key = COALESCE(
        CASE latest_paid.metadata->>'plan_key'
          WHEN 'starter' THEN 'monthly'
          WHEN 'standard' THEN 'monthly'
          WHEN 'pro' THEN 'quarterly'
          WHEN 'premium' THEN 'quarterly'
          WHEN 'trial' THEN 'monthly'
          WHEN 'monthly' THEN 'monthly'
          WHEN 'quarterly' THEN 'quarterly'
          WHEN 'yearly' THEN 'yearly'
          ELSE null
        END,
        p.plan_key
      ),
      billing_cycle = CASE
        WHEN latest_paid.metadata->>'period' IN ('monthly', 'quarterly', 'yearly') THEN latest_paid.metadata->>'period'
        ELSE p.billing_cycle
      END,
      trial_used = p.trial_used OR COALESCE(latest_paid.metadata->>'plan_key' = 'trial', false),
      updated_at = now()
  FROM latest_paid
  WHERE p.user_id = latest_paid.user_id
  RETURNING p.user_id, latest_paid.payment_id, latest_paid.metadata
)
UPDATE public.recruiter_payments rp
SET user_id = repaired_profiles.user_id,
    guest_email = NULL,
    metadata = COALESCE(repaired_profiles.metadata, '{}'::jsonb)
      || jsonb_build_object('applied_to_user', repaired_profiles.user_id::text, 'applied_at', now())
FROM repaired_profiles
WHERE rp.id = repaired_profiles.payment_id;

INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount)
SELECT DISTINCT ON (p.user_id)
  p.user_id,
  date_trunc('month', CURRENT_DATE)::date,
  p.plan_tier::text,
  CASE
    WHEN COALESCE(rp.metadata->>'coins', '') ~ '^\d+$' THEN (rp.metadata->>'coins')::integer
    WHEN p.plan_tier = 'premium'::public.plan_tier THEN 200
    ELSE 100
  END
FROM public.profiles p
JOIN public.recruiter_payments rp
  ON rp.user_id = p.user_id
 AND rp.purpose = 'talent_membership'
 AND rp.status = 'success'
WHERE p.plan_tier <> 'free'::public.plan_tier
  AND p.paid_until > now()
ON CONFLICT (user_id, period_month) DO NOTHING;