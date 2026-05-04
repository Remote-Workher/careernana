-- 1. Referral code + referred-by on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS last_monthly_grant date;

-- 2. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referee_user_id uuid NOT NULL,
  referrer_code text NOT NULL,
  plan_tier text NOT NULL CHECK (plan_tier IN ('standard','premium')),
  coins_awarded integer NOT NULL DEFAULT 0,
  paid_amount_naira integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referee_user_id, plan_tier)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view referrals they made"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);

-- 3. Random unique referral-code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  exists_count int;
BEGIN
  LOOP
    candidate := upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
    SELECT count(*) INTO exists_count FROM public.profiles WHERE referral_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 4. Backfill existing profiles with codes
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- 5. Trigger to auto-assign code on insert
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON public.profiles;
CREATE TRIGGER profiles_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- 6. Monthly coin grant — cumulative top-up, capped at 1/month
CREATE OR REPLACE FUNCTION public.grant_monthly_coins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _paid_until timestamptz;
  _last_grant date;
  _allowance int;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _new_balance int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_authenticated');
  END IF;

  SELECT plan_tier::text, paid_until, last_monthly_grant
    INTO _tier, _paid_until, _last_grant
  FROM public.profiles WHERE user_id = _uid;

  IF _tier IS NULL OR _tier = 'free' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'no_membership');
  END IF;

  IF _paid_until IS NOT NULL AND _paid_until < now() THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'membership_expired');
  END IF;

  IF _last_grant IS NOT NULL
     AND date_trunc('month', _last_grant) = date_trunc('month', _today) THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month');
  END IF;

  _allowance := CASE WHEN _tier = 'premium' THEN 200 ELSE 50 END;

  UPDATE public.profiles
  SET tokens_remaining = COALESCE(tokens_remaining, 0) + _allowance,
      last_monthly_grant = _today,
      updated_at = now()
  WHERE user_id = _uid
  RETURNING tokens_remaining INTO _new_balance;

  RETURN jsonb_build_object(
    'granted', true,
    'tier', _tier,
    'amount', _allowance,
    'new_balance', _new_balance
  );
END;
$$;

-- 7. Record referral payout — idempotent per referee+plan
CREATE OR REPLACE FUNCTION public.record_referral_payout(
  _referee_user_id uuid,
  _plan_tier text,
  _paid_amount_naira int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_code text;
  _referrer_id uuid;
  _coins int;
  _existing int;
BEGIN
  IF _plan_tier NOT IN ('standard','premium') THEN
    RETURN jsonb_build_object('paid', false, 'reason', 'invalid_plan');
  END IF;

  -- Look up referee's referred_by_code
  SELECT referred_by_code INTO _referrer_code
    FROM public.profiles WHERE user_id = _referee_user_id;
  IF _referrer_code IS NULL OR _referrer_code = '' THEN
    RETURN jsonb_build_object('paid', false, 'reason', 'no_referrer');
  END IF;

  -- Find referrer
  SELECT user_id INTO _referrer_id
    FROM public.profiles WHERE referral_code = _referrer_code;
  IF _referrer_id IS NULL THEN
    RETURN jsonb_build_object('paid', false, 'reason', 'referrer_not_found');
  END IF;

  -- Don't pay self-referrals
  IF _referrer_id = _referee_user_id THEN
    RETURN jsonb_build_object('paid', false, 'reason', 'self_referral');
  END IF;

  -- Idempotent — only pay first time for this referee+plan
  SELECT count(*) INTO _existing FROM public.referrals
    WHERE referee_user_id = _referee_user_id AND plan_tier = _plan_tier;
  IF _existing > 0 THEN
    RETURN jsonb_build_object('paid', false, 'reason', 'already_paid');
  END IF;

  _coins := CASE WHEN _plan_tier = 'premium' THEN 200 ELSE 50 END;

  INSERT INTO public.referrals (referrer_user_id, referee_user_id, referrer_code, plan_tier, coins_awarded, paid_amount_naira)
  VALUES (_referrer_id, _referee_user_id, _referrer_code, _plan_tier, _coins, _paid_amount_naira);

  UPDATE public.profiles
  SET tokens_remaining = COALESCE(tokens_remaining, 0) + _coins,
      updated_at = now()
  WHERE user_id = _referrer_id;

  RETURN jsonb_build_object('paid', true, 'referrer_id', _referrer_id, 'coins', _coins);
END;
$$;