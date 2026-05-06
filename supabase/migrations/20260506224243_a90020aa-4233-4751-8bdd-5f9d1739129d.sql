-- Extend allowed event kinds
ALTER TABLE public.application_events
  DROP CONSTRAINT IF EXISTS application_events_kind_check;
ALTER TABLE public.application_events
  ADD CONSTRAINT application_events_kind_check
  CHECK (kind = ANY (ARRAY[
    'submitted','application_opened','profile_viewed',
    'status_changed','email_sent','note_added',
    'follow_up_request'
  ]));

-- RPC for applicants to request a follow-up
CREATE OR REPLACE FUNCTION public.request_application_follow_up(_application_id uuid, _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _app record;
  _last timestamptz;
  _coins int;
  _new_coins int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, applicant_user_id, recruiter_user_id, created_at
    INTO _app
  FROM public.job_applications
  WHERE id = _application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  IF _app.applicant_user_id IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Cooldown: 3 days between follow-ups
  SELECT max(created_at) INTO _last
  FROM public.application_events
  WHERE application_id = _application_id
    AND kind = 'follow_up_request';

  IF _last IS NOT NULL AND _last > now() - interval '3 days' THEN
    RETURN jsonb_build_object(
      'sent', false,
      'reason', 'cooldown',
      'next_available_at', _last + interval '3 days'
    );
  END IF;

  -- Check coin balance
  SELECT tokens_remaining INTO _coins
  FROM public.profiles WHERE user_id = _uid;
  IF COALESCE(_coins, 0) < 2 THEN
    RETURN jsonb_build_object('sent', false, 'reason', 'insufficient_coins', 'balance', COALESCE(_coins, 0));
  END IF;

  -- Deduct 2 coins
  UPDATE public.profiles
  SET tokens_remaining = GREATEST(tokens_remaining - 2, 0),
      updated_at = now()
  WHERE user_id = _uid
  RETURNING tokens_remaining INTO _new_coins;

  -- Log event for the recruiter to see
  INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind, payload)
  VALUES (
    _application_id, _uid, _app.recruiter_user_id, 'follow_up_request',
    jsonb_build_object('message', COALESCE(_message, ''), 'cost_coins', 2)
  );

  RETURN jsonb_build_object('sent', true, 'new_balance', _new_coins);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_application_follow_up(uuid, text) TO authenticated;