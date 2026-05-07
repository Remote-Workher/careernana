CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON public.community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_channel_created
  ON public.community_posts (channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_user
  ON public.recruiter_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

CREATE INDEX IF NOT EXISTS idx_app_events_app_created
  ON public.application_events (application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool_created
  ON public.tool_usage (user_id, tool_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  _tool_name text,
  _per_minute int DEFAULT 12,
  _per_hour int DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _minute_count int;
  _hour_count int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT count(*) INTO _minute_count
  FROM public.tool_usage
  WHERE user_id = _uid AND tool_name = _tool_name
    AND created_at > now() - interval '1 minute';
  IF _minute_count >= _per_minute THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'minute_limit',
      'limit', _per_minute, 'used', _minute_count);
  END IF;

  SELECT count(*) INTO _hour_count
  FROM public.tool_usage
  WHERE user_id = _uid AND tool_name = _tool_name
    AND created_at > now() - interval '1 hour';
  IF _hour_count >= _per_hour THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hour_limit',
      'limit', _per_hour, 'used', _hour_count);
  END IF;

  RETURN jsonb_build_object('allowed', true,
    'minute_used', _minute_count, 'hour_used', _hour_count);
END;
$$;