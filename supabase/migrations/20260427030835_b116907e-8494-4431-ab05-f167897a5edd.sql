-- Job applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.recruiter_jobs(id) ON DELETE CASCADE,
  recruiter_user_id UUID NOT NULL,
  applicant_user_id UUID NOT NULL,
  applicant_name TEXT,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_location TEXT,
  applicant_headline TEXT,
  applicant_avatar_seed TEXT,
  resume_content TEXT,
  resume_version_id UUID,
  cover_letter TEXT,
  match_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'applied',
  is_boosted BOOLEAN NOT NULL DEFAULT false,
  boosted_until TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  recruiter_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_user_id)
);

CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_user_id);
CREATE INDEX idx_job_applications_recruiter ON public.job_applications(recruiter_user_id);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants insert own applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

CREATE POLICY "Applicants view own applications"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "Applicants update own applications (boost)"
  ON public.job_applications FOR UPDATE
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "Recruiters view applications to own jobs"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = recruiter_user_id);

CREATE POLICY "Recruiters update applications to own jobs"
  ON public.job_applications FOR UPDATE
  USING (auth.uid() = recruiter_user_id);

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Increment applications_count on insert
CREATE OR REPLACE FUNCTION public.increment_recruiter_applications_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.recruiter_jobs
  SET applications_count = applications_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_recruiter_applications_count
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.increment_recruiter_applications_count();

-- Email templates
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.email_templates (slug, name, category, subject, body, description) VALUES
('rejection-standard', 'Rejection — polite & encouraging', 'rejection',
 'Update on your application for {{job_title}} at {{company_name}}',
 'Hi {{applicant_name}},

Thank you for taking the time to apply for the {{job_title}} role at {{company_name}}. We received an incredible number of strong applications, and after careful review, we''ve decided to move forward with other candidates whose experience more closely matches what we''re looking for right now.

This is in no way a reflection of your skills or potential. We''ll keep your profile on file and reach out if a more suitable role opens up.

Wishing you the very best in your job search.

Warm regards,
The {{company_name}} team',
 'Kind, professional rejection that leaves the door open.'),

('interview-invitation', 'Interview invitation', 'interview',
 'You''re invited to interview for {{job_title}} at {{company_name}}',
 'Hi {{applicant_name}},

Great news — we''ve reviewed your application for the {{job_title}} role at {{company_name}}, and we''d love to learn more about you.

We''d like to invite you to a 30-minute introductory interview. Please reply to this email with 2–3 time slots that work for you over the next week, and we''ll confirm one of them.

If you have any questions in the meantime, just hit reply.

Looking forward to speaking with you.

Best,
The {{company_name}} hiring team',
 'Invite a candidate to a first-round interview.'),

('offer-extended', 'Offer extended', 'offer',
 'An offer for the {{job_title}} role at {{company_name}}',
 'Hi {{applicant_name}},

We''re thrilled to offer you the {{job_title}} position at {{company_name}}.

Your experience, energy, and the way you showed up throughout the process made it clear that you''re a brilliant fit for our team. We''ll send across the formal offer letter and details shortly, but we wanted to share the news as soon as possible.

Please reply to confirm you''ve received this, and let us know if you''d like to jump on a quick call to talk through anything.

Welcome (almost!) to the team.

Warmly,
The {{company_name}} team',
 'Send a warm offer announcement.');

-- Audit log of recruiter-sent emails
CREATE TABLE public.email_send_log_recruiter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_user_id UUID NOT NULL,
  job_id UUID REFERENCES public.recruiter_jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  template_slug TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log_recruiter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own send log"
  ON public.email_send_log_recruiter FOR SELECT
  USING (auth.uid() = recruiter_user_id);

CREATE INDEX idx_email_send_log_recruiter_user ON public.email_send_log_recruiter(recruiter_user_id);
CREATE INDEX idx_email_send_log_recruiter_job ON public.email_send_log_recruiter(job_id);