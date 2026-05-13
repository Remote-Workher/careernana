CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_payment record;
  payment_email text;
  payment_reference text;
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
    payment_email := lower(COALESCE(NEW.raw_user_meta_data->>'paid_email', NEW.email, ''));
    payment_reference := NULLIF(NEW.raw_user_meta_data->>'paid_reference', '');

    SELECT rp.*
    INTO matched_payment
    FROM public.recruiter_payments rp
    WHERE rp.purpose = 'talent_membership'
      AND rp.status = 'success'
      AND (rp.user_id IS NULL OR rp.user_id = NEW.id)
      AND (
        (payment_reference IS NOT NULL AND rp.paystack_reference = payment_reference)
        OR lower(COALESCE(rp.guest_email, rp.metadata->>'guest_email', rp.metadata->>'paid_email', '')) = payment_email
      )
    ORDER BY
      CASE WHEN payment_reference IS NOT NULL AND rp.paystack_reference = payment_reference THEN 0 ELSE 1 END,
      rp.paid_at DESC NULLS LAST,
      rp.created_at DESC
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
        ELSE NULL
      END;
      paid_period := COALESCE(NULLIF(matched_payment.metadata->>'period', ''), paid_plan_key);
      paid_until_at := COALESCE(matched_payment.paid_at, now()) + make_interval(days => paid_period_days);

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
        CASE WHEN paid_period IN ('monthly', 'quarterly', 'yearly') THEN paid_period ELSE paid_plan_key END,
        COALESCE(raw_plan_key = 'trial', false)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        tokens_remaining = GREATEST(public.profiles.tokens_remaining, EXCLUDED.tokens_remaining),
        plan_tier = EXCLUDED.plan_tier,
        paid_until = EXCLUDED.paid_until,
        paid_from = EXCLUDED.paid_from,
        last_monthly_grant = EXCLUDED.last_monthly_grant,
        plan_key = EXCLUDED.plan_key,
        billing_cycle = EXCLUDED.billing_cycle,
        trial_used = public.profiles.trial_used OR EXCLUDED.trial_used,
        updated_at = now();

      updated_payment_metadata := COALESCE(matched_payment.metadata, '{}'::jsonb)
        || jsonb_build_object('applied_to_user', NEW.id::text, 'applied_at', now());

      UPDATE public.recruiter_payments
      SET user_id = NEW.id,
          guest_email = NULL,
          metadata = updated_payment_metadata
      WHERE id = matched_payment.id;

      INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount)
      VALUES (NEW.id, date_trunc('month', CURRENT_DATE)::date, paid_tier::text, paid_coins)
      ON CONFLICT (user_id, period_month) DO UPDATE
      SET tier = EXCLUDED.tier,
          amount = GREATEST(public.monthly_coin_grants.amount, EXCLUDED.amount);
    ELSE
      -- Remote Workher is paid-only: do not create a free talent profile when no paid membership payment exists.
      RETURN NEW;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;