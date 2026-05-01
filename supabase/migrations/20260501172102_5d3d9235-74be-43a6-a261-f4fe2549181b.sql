-- Plan tier enum
CREATE TYPE public.plan_tier AS ENUM ('free', 'standard', 'premium');

-- Add plan_tier to profiles (default free)
ALTER TABLE public.profiles
  ADD COLUMN plan_tier public.plan_tier NOT NULL DEFAULT 'free';

-- Monthly usage counters for resources & courses
CREATE TABLE public.member_monthly_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_month date NOT NULL, -- first day of the month
  resources_used integer NOT NULL DEFAULT 0,
  courses_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);

ALTER TABLE public.member_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage"
  ON public.member_monthly_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own usage"
  ON public.member_monthly_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own usage"
  ON public.member_monthly_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_member_monthly_usage_updated_at
  BEFORE UPDATE ON public.member_monthly_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic consumer: enforces premium tier + monthly cap of 3 per kind
CREATE OR REPLACE FUNCTION public.consume_member_quota(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier public.plan_tier;
  _paid_until timestamptz;
  _period date := date_trunc('month', now())::date;
  _row public.member_monthly_usage%ROWTYPE;
  _used integer;
  _limit constant integer := 3;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _kind NOT IN ('resource', 'course') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;

  SELECT plan_tier, paid_until INTO _tier, _paid_until
  FROM public.profiles WHERE user_id = _uid;

  IF _tier IS NULL OR _tier = 'free' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_membership', 'tier', _tier);
  END IF;
  IF _tier = 'standard' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'tier_locked', 'tier', _tier);
  END IF;
  IF _paid_until IS NOT NULL AND _paid_until < now() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'membership_expired', 'tier', _tier);
  END IF;

  -- Premium: enforce monthly cap
  INSERT INTO public.member_monthly_usage (user_id, period_month)
  VALUES (_uid, _period)
  ON CONFLICT (user_id, period_month) DO NOTHING;

  SELECT * INTO _row FROM public.member_monthly_usage
  WHERE user_id = _uid AND period_month = _period FOR UPDATE;

  IF _kind = 'resource' THEN _used := _row.resources_used;
  ELSE _used := _row.courses_used; END IF;

  IF _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached',
      'tier', _tier, 'used', _used, 'limit', _limit);
  END IF;

  IF _kind = 'resource' THEN
    UPDATE public.member_monthly_usage
    SET resources_used = resources_used + 1, updated_at = now()
    WHERE user_id = _uid AND period_month = _period;
  ELSE
    UPDATE public.member_monthly_usage
    SET courses_used = courses_used + 1, updated_at = now()
    WHERE user_id = _uid AND period_month = _period;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'tier', _tier,
    'used', _used + 1, 'limit', _limit);
END;
$$;