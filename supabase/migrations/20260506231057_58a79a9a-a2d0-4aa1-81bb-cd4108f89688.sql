
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 1. Notify applicant when status changes to a notable value
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job_title text;
  _company text;
  _label text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('in_review','shortlisted','interview','hired','rejected') THEN
    SELECT j.title, COALESCE(rp.company_name, '')
      INTO _job_title, _company
    FROM public.recruiter_jobs j
    LEFT JOIN public.recruiter_profiles rp ON rp.user_id = j.recruiter_user_id
    WHERE j.id = NEW.job_id;

    _label := CASE NEW.status
      WHEN 'in_review' THEN 'is now In Review'
      WHEN 'shortlisted' THEN 'has been Shortlisted'
      WHEN 'interview' THEN 'moved to Interview stage'
      WHEN 'hired' THEN 'received an Offer 🎉'
      WHEN 'rejected' THEN 'was not selected'
      ELSE 'was updated'
    END;

    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (
      NEW.applicant_user_id,
      'application_status',
      'Application update: ' || _label,
      COALESCE(_job_title, 'Your application') ||
        CASE WHEN _company <> '' THEN ' at ' || _company ELSE '' END,
      '/applications',
      jsonb_build_object('application_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_application_status_change
AFTER UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_status_change();

-- 2. New published class → notify all talent profiles
CREATE OR REPLACE FUNCTION public.notify_new_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    SELECT p.user_id, 'new_class',
           'New class: ' || NEW.title,
           COALESCE(NEW.description, 'A new class just dropped in the Vault.'),
           '/courses',
           jsonb_build_object('class_id', NEW.id)
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_class
AFTER INSERT ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_class();

-- 3. New live session → notify all talent profiles
CREATE OR REPLACE FUNCTION public.notify_new_live_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    SELECT p.user_id, 'new_live_session',
           'Live session: ' || NEW.title,
           'Starts ' || to_char(NEW.starts_at AT TIME ZONE 'UTC', 'Mon DD at HH24:MI') || ' UTC',
           '/live-sessions/' || NEW.id::text,
           jsonb_build_object('session_id', NEW.id, 'starts_at', NEW.starts_at)
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_live_session
AFTER INSERT ON public.live_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_live_session();

-- 4. Low coin balance: when tokens_remaining drops below 5 (and was higher before)
CREATE OR REPLACE FUNCTION public.notify_low_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent_count int;
BEGIN
  IF NEW.tokens_remaining IS DISTINCT FROM OLD.tokens_remaining
     AND NEW.tokens_remaining < 5
     AND COALESCE(OLD.tokens_remaining, 0) >= 5 THEN
    -- Avoid spamming: skip if a low-coin notif was sent in the last 24h
    SELECT count(*) INTO _recent_count
    FROM public.notifications
    WHERE user_id = NEW.user_id
      AND kind = 'low_coins'
      AND created_at > now() - interval '24 hours';

    IF _recent_count = 0 THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (
        NEW.user_id,
        'low_coins',
        'Your AI Coins are running low',
        'You have ' || NEW.tokens_remaining || ' coins left. Top up to keep using AI tools.',
        '/account#coins'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_coins
AFTER UPDATE OF tokens_remaining ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_coins();
