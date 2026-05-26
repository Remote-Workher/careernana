CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    LEFT JOIN public.recruiter_profiles rp ON rp.user_id = j.user_id
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
END; $function$;