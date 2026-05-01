-- ============= application_events =============
CREATE TABLE IF NOT EXISTS public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  applicant_user_id uuid NOT NULL,
  recruiter_user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN (
    'submitted',
    'application_opened',
    'profile_viewed',
    'status_changed',
    'email_sent',
    'note_added'
  )),
  -- Optional structured payload, e.g. {from:'applied', to:'shortlisted'} or {subject:'...', template:'...'}
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_app ON public.application_events(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_applicant ON public.application_events(applicant_user_id, created_at DESC);

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicant views own events"
  ON public.application_events FOR SELECT
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "Recruiter views own job events"
  ON public.application_events FOR SELECT
  USING (auth.uid() = recruiter_user_id);

-- No direct INSERT policies — events are inserted by SECURITY DEFINER triggers / RPC only.

-- ============= Triggers =============

-- 1) On application insert → log 'submitted'
CREATE OR REPLACE FUNCTION public.log_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind, payload)
  VALUES (NEW.id, NEW.applicant_user_id, NEW.recruiter_user_id, 'submitted', jsonb_build_object('status', NEW.status));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_submitted ON public.job_applications;
CREATE TRIGGER trg_app_submitted
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_submitted();

-- 2) On status change → log 'status_changed'
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind, payload)
    VALUES (NEW.id, NEW.applicant_user_id, NEW.recruiter_user_id, 'status_changed',
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_status_change ON public.job_applications;
CREATE TRIGGER trg_app_status_change
  AFTER UPDATE OF status ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_status_change();

-- 3) On recruiter email send → log 'email_sent' for each matching application
CREATE OR REPLACE FUNCTION public.log_application_email_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app record;
BEGIN
  IF NEW.application_id IS NOT NULL THEN
    SELECT applicant_user_id, recruiter_user_id INTO _app
      FROM public.job_applications WHERE id = NEW.application_id;
    IF FOUND THEN
      INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind, payload)
      VALUES (NEW.application_id, _app.applicant_user_id, _app.recruiter_user_id, 'email_sent',
              jsonb_build_object('subject', NEW.subject, 'template', NEW.template_slug));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_email_sent ON public.email_send_log_recruiter;
CREATE TRIGGER trg_app_email_sent
  AFTER INSERT ON public.email_send_log_recruiter
  FOR EACH ROW EXECUTE FUNCTION public.log_application_email_sent();

-- ============= RPC: mark_application_event (for view/open events) =============
-- Idempotent within 1 hour: doesn't log duplicates within an hour for the same kind+app.
CREATE OR REPLACE FUNCTION public.mark_application_event(_application_id uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app record;
  _recent timestamptz;
BEGIN
  IF _kind NOT IN ('application_opened','profile_viewed') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;

  SELECT applicant_user_id, recruiter_user_id INTO _app
    FROM public.job_applications WHERE id = _application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  -- Only the recruiter who owns the job may mark these events
  IF auth.uid() IS DISTINCT FROM _app.recruiter_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Dedupe within the last hour for the same application + kind
  SELECT max(created_at) INTO _recent
    FROM public.application_events
    WHERE application_id = _application_id
      AND kind = _kind
      AND created_at > now() - interval '1 hour';

  IF _recent IS NULL THEN
    INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind)
    VALUES (_application_id, _app.applicant_user_id, _app.recruiter_user_id, _kind);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_application_event(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_application_event(uuid, text) TO authenticated;