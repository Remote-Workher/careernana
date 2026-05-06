-- Auto-promote job_applications.status based on recruiter activity logged in application_events
CREATE OR REPLACE FUNCTION public.auto_advance_status_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind IN ('application_opened','profile_viewed') THEN
    UPDATE public.job_applications
       SET status = 'in_review', updated_at = now()
     WHERE id = NEW.application_id
       AND status = 'applied';
  ELSIF NEW.kind = 'email_sent' THEN
    IF (NEW.payload->>'template') = 'interview-invitation' THEN
      UPDATE public.job_applications
         SET status = 'shortlisted', updated_at = now()
       WHERE id = NEW.application_id
         AND status IN ('applied','in_review');
    ELSIF (NEW.payload->>'template') = 'offer-extended' THEN
      UPDATE public.job_applications
         SET status = 'hired', updated_at = now()
       WHERE id = NEW.application_id;
    ELSIF (NEW.payload->>'template') = 'rejection-standard' THEN
      UPDATE public.job_applications
         SET status = 'rejected', updated_at = now()
       WHERE id = NEW.application_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_advance_status ON public.application_events;
CREATE TRIGGER trg_auto_advance_status
AFTER INSERT ON public.application_events
FOR EACH ROW EXECUTE FUNCTION public.auto_advance_status_on_event();