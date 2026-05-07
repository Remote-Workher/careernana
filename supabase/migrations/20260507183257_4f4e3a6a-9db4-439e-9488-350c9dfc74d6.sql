
CREATE TABLE public.applicant_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  recruiter_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_applicant_notes_app ON public.applicant_notes(application_id, created_at DESC);
CREATE INDEX idx_applicant_notes_recruiter ON public.applicant_notes(recruiter_user_id);

ALTER TABLE public.applicant_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiter views own notes" ON public.applicant_notes
  FOR SELECT USING (auth.uid() = recruiter_user_id);
CREATE POLICY "Recruiter inserts own notes" ON public.applicant_notes
  FOR INSERT WITH CHECK (auth.uid() = recruiter_user_id);
CREATE POLICY "Recruiter updates own notes" ON public.applicant_notes
  FOR UPDATE USING (auth.uid() = recruiter_user_id);
CREATE POLICY "Recruiter deletes own notes" ON public.applicant_notes
  FOR DELETE USING (auth.uid() = recruiter_user_id);

CREATE TRIGGER update_applicant_notes_updated_at
  BEFORE UPDATE ON public.applicant_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_applicant_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app record;
BEGIN
  SELECT applicant_user_id, recruiter_user_id INTO _app
    FROM public.job_applications WHERE id = NEW.application_id;
  IF FOUND THEN
    INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind, payload)
    VALUES (NEW.application_id, _app.applicant_user_id, _app.recruiter_user_id, 'note_added',
            jsonb_build_object('preview', left(NEW.body, 140)));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_applicant_note
  AFTER INSERT ON public.applicant_notes
  FOR EACH ROW EXECUTE FUNCTION public.log_applicant_note();
