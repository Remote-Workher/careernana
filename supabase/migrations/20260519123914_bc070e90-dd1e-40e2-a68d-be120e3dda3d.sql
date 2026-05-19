
CREATE TABLE public.recruiter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  contact_name text NOT NULL,
  company_name text NOT NULL,
  company_website text,
  company_size text,
  industry text,
  company_logo_url text,
  company_description text,
  role_title text,
  culture text,
  hiring_process text,
  linkedin_url text,
  twitter_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  approved_user_id uuid
);

CREATE UNIQUE INDEX recruiter_applications_email_pending_unique
  ON public.recruiter_applications (lower(email))
  WHERE status = 'pending';

CREATE INDEX idx_recruiter_applications_status ON public.recruiter_applications (status);
CREATE INDEX idx_recruiter_applications_email ON public.recruiter_applications (lower(email));

ALTER TABLE public.recruiter_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (no account required)
CREATE POLICY "Anyone can submit recruiter application"
  ON public.recruiter_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only admins can read
CREATE POLICY "Admins view recruiter applications"
  ON public.recruiter_applications
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins update recruiter applications"
  ON public.recruiter_applications
  FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recruiter_applications_updated_at
BEFORE UPDATE ON public.recruiter_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
