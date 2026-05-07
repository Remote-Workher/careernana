-- 1) Track per-resource unlocks so re-access is idempotent
CREATE TABLE IF NOT EXISTS public.resource_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id text NOT NULL,
  kind text NOT NULL DEFAULT 'resource',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, resource_id)
);

ALTER TABLE public.resource_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own unlocks"
  ON public.resource_unlocks FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts happen via SECURITY DEFINER function only; no INSERT/UPDATE/DELETE policies.

-- 2) Idempotent quota function
CREATE OR REPLACE FUNCTION public.consume_member_quota(_kind text, _resource_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _tier public.plan_tier;
  _paid_until timestamptz;
  _period date := date_trunc('month', now())::date;
  _row public.member_monthly_usage%ROWTYPE;
  _used integer;
  _limit constant integer := 3;
  _already_unlocked boolean := false;
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

  -- Idempotent path: already unlocked this resource → free re-access
  IF _resource_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.resource_unlocks
      WHERE user_id = _uid AND kind = _kind AND resource_id = _resource_id
    ) INTO _already_unlocked;

    IF _already_unlocked THEN
      SELECT * INTO _row FROM public.member_monthly_usage
        WHERE user_id = _uid AND period_month = _period;
      IF _kind = 'resource' THEN _used := COALESCE(_row.resources_used, 0);
      ELSE _used := COALESCE(_row.courses_used, 0); END IF;
      RETURN jsonb_build_object('allowed', true, 'tier', _tier,
        'used', _used, 'limit', _limit, 'already_unlocked', true);
    END IF;
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

  -- Record the unlock so future access is idempotent
  IF _resource_id IS NOT NULL THEN
    INSERT INTO public.resource_unlocks (user_id, resource_id, kind)
    VALUES (_uid, _resource_id, _kind)
    ON CONFLICT (user_id, kind, resource_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'tier', _tier,
    'used', _used + 1, 'limit', _limit, 'already_unlocked', false);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.consume_member_quota(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_member_quota(text, text) TO authenticated;

-- 3) Refund affected user (resource counter wasn't really used for unique resources)
UPDATE public.member_monthly_usage
SET resources_used = 0, updated_at = now()
WHERE user_id = 'ec66152f-fde6-4402-80b8-3b343d481163'
  AND period_month = '2026-05-01';
