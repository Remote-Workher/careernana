CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  inapp_application_status boolean NOT NULL DEFAULT true,
  inapp_new_class boolean NOT NULL DEFAULT true,
  inapp_new_live_session boolean NOT NULL DEFAULT true,
  inapp_low_coins boolean NOT NULL DEFAULT true,
  email_application_status boolean NOT NULL DEFAULT true,
  email_new_class boolean NOT NULL DEFAULT false,
  email_new_live_session boolean NOT NULL DEFAULT false,
  email_low_coins boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notif prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notif prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notif prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update notification triggers to respect in-app preferences
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _job_title text; _company text; _label text; _enabled boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('in_review','shortlisted','interview','hired','rejected') THEN
    SELECT COALESCE(inapp_application_status, true) INTO _enabled
      FROM public.notification_preferences WHERE user_id = NEW.applicant_user_id;
    IF _enabled IS NULL THEN _enabled := true; END IF;
    IF NOT _enabled THEN RETURN NEW; END IF;

    SELECT j.title, COALESCE(rp.company_name, '') INTO _job_title, _company
    FROM public.recruiter_jobs j
    LEFT JOIN public.recruiter_profiles rp ON rp.user_id = j.recruiter_user_id
    WHERE j.id = NEW.job_id;

    _label := CASE NEW.status
      WHEN 'in_review' THEN 'is now In Review'
      WHEN 'shortlisted' THEN 'has been Shortlisted'
      WHEN 'interview' THEN 'moved to Interview stage'
      WHEN 'hired' THEN 'received an Offer 🎉'
      WHEN 'rejected' THEN 'was not selected'
      ELSE 'was updated' END;

    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (NEW.applicant_user_id, 'application_status',
      'Application update: ' || _label,
      COALESCE(_job_title, 'Your application') ||
        CASE WHEN _company <> '' THEN ' at ' || _company ELSE '' END,
      '/applications',
      jsonb_build_object('application_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_new_class()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_published THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    SELECT p.user_id, 'new_class',
           'New class: ' || NEW.title,
           COALESCE(NEW.description, 'A new class just dropped in the Vault.'),
           '/courses',
           jsonb_build_object('class_id', NEW.id)
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
    WHERE COALESCE(np.inapp_new_class, true) = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_new_live_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_published THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    SELECT p.user_id, 'new_live_session',
           'Live session: ' || NEW.title,
           'Starts ' || to_char(NEW.starts_at AT TIME ZONE 'UTC', 'Mon DD at HH24:MI') || ' UTC',
           '/live-sessions/' || NEW.id::text,
           jsonb_build_object('session_id', NEW.id, 'starts_at', NEW.starts_at)
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
    WHERE COALESCE(np.inapp_new_live_session, true) = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_low_coins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _recent_count int; _enabled boolean;
BEGIN
  IF NEW.tokens_remaining IS DISTINCT FROM OLD.tokens_remaining
     AND NEW.tokens_remaining < 5
     AND COALESCE(OLD.tokens_remaining, 0) >= 5 THEN
    SELECT COALESCE(inapp_low_coins, true) INTO _enabled
      FROM public.notification_preferences WHERE user_id = NEW.user_id;
    IF _enabled IS NULL THEN _enabled := true; END IF;
    IF NOT _enabled THEN RETURN NEW; END IF;

    SELECT count(*) INTO _recent_count FROM public.notifications
      WHERE user_id = NEW.user_id AND kind = 'low_coins'
        AND created_at > now() - interval '24 hours';
    IF _recent_count = 0 THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (NEW.user_id, 'low_coins', 'Your AI Coins are running low',
        'You have ' || NEW.tokens_remaining || ' coins left. Top up to keep using AI tools.',
        '/account#coins');
    END IF;
  END IF;
  RETURN NEW;
END; $$;