-- Add plan_key + trial_used to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_key text,
  ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- Allow only known plan keys
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_key_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_key_check
  CHECK (plan_key IS NULL OR plan_key IN ('trial','quarterly','yearly'));

-- Update quota function: trial = lifetime caps; new member plans behave like premium
CREATE OR REPLACE FUNCTION private.consume_member_quota_impl(_kind text, _resource_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _tier public.plan_tier; _paid_until timestamptz; _plan_key text;
        _period date := date_trunc('month', now())::date;
        _row public.member_monthly_usage%ROWTYPE; _used integer;
        _limit integer; _already_unlocked boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _kind NOT IN ('resource', 'course') THEN RAISE EXCEPTION 'invalid_kind'; END IF;
  SELECT plan_tier, paid_until, plan_key INTO _tier, _paid_until, _plan_key
    FROM public.profiles WHERE user_id = _uid;
  IF _tier IS NULL OR _tier = 'free' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_membership', 'tier', _tier); END IF;
  IF _paid_until IS NOT NULL AND _paid_until < now() THEN RETURN jsonb_build_object('allowed', false, 'reason', 'membership_expired', 'tier', _tier); END IF;

  -- TRIAL: lifetime caps tracked via resource_unlocks count (2 resources, 1 course total)
  IF _plan_key = 'trial' THEN
    IF _kind = 'resource' THEN _limit := 2; ELSE _limit := 1; END IF;

    IF _resource_id IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM public.resource_unlocks
        WHERE user_id = _uid AND kind = _kind AND resource_id = _resource_id)
        INTO _already_unlocked;
    END IF;

    SELECT count(*) INTO _used FROM public.resource_unlocks
      WHERE user_id = _uid AND kind = _kind;

    IF _already_unlocked THEN
      RETURN jsonb_build_object('allowed', true, 'tier', _tier, 'plan_key', _plan_key,
        'used', _used, 'limit', _limit, 'already_unlocked', true);
    END IF;

    IF _used >= _limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'trial_limit_reached',
        'tier', _tier, 'plan_key', _plan_key, 'used', _used, 'limit', _limit);
    END IF;

    IF _resource_id IS NOT NULL THEN
      INSERT INTO public.resource_unlocks (user_id, resource_id, kind)
        VALUES (_uid, _resource_id, _kind)
        ON CONFLICT (user_id, kind, resource_id) DO NOTHING;
    END IF;
    RETURN jsonb_build_object('allowed', true, 'tier', _tier, 'plan_key', _plan_key,
      'used', _used + 1, 'limit', _limit, 'already_unlocked', false);
  END IF;

  -- Tier-based monthly limits (legacy + new quarterly/yearly which use plan_tier='premium')
  IF _kind = 'resource' THEN
    _limit := CASE WHEN _tier = 'premium' THEN 5 ELSE 2 END;
  ELSE
    -- Courses are Premium-only (new quarterly/yearly are stored as premium too)
    IF _tier = 'standard' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'tier_locked', 'tier', _tier); END IF;
    _limit := 3;
  END IF;

  IF _resource_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.resource_unlocks WHERE user_id = _uid AND kind = _kind AND resource_id = _resource_id)
      INTO _already_unlocked;
    IF _already_unlocked THEN
      SELECT * INTO _row FROM public.member_monthly_usage WHERE user_id = _uid AND period_month = _period;
      IF _kind = 'resource' THEN _used := COALESCE(_row.resources_used, 0); ELSE _used := COALESCE(_row.courses_used, 0); END IF;
      RETURN jsonb_build_object('allowed', true, 'tier', _tier, 'used', _used, 'limit', _limit, 'already_unlocked', true);
    END IF;
  END IF;
  INSERT INTO public.member_monthly_usage (user_id, period_month) VALUES (_uid, _period) ON CONFLICT (user_id, period_month) DO NOTHING;
  SELECT * INTO _row FROM public.member_monthly_usage WHERE user_id = _uid AND period_month = _period FOR UPDATE;
  IF _kind = 'resource' THEN _used := _row.resources_used; ELSE _used := _row.courses_used; END IF;
  IF _used >= _limit THEN RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached', 'tier', _tier, 'used', _used, 'limit', _limit); END IF;
  IF _kind = 'resource' THEN
    UPDATE public.member_monthly_usage SET resources_used = resources_used + 1, updated_at = now() WHERE user_id = _uid AND period_month = _period;
  ELSE
    UPDATE public.member_monthly_usage SET courses_used = courses_used + 1, updated_at = now() WHERE user_id = _uid AND period_month = _period;
  END IF;
  IF _resource_id IS NOT NULL THEN
    INSERT INTO public.resource_unlocks (user_id, resource_id, kind) VALUES (_uid, _resource_id, _kind)
    ON CONFLICT (user_id, kind, resource_id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('allowed', true, 'tier', _tier, 'used', _used + 1, 'limit', _limit, 'already_unlocked', false);
END $$;