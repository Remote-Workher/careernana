-- 1. Hercademy fields on vetting_applications
ALTER TABLE public.vetting_applications
  ADD COLUMN IF NOT EXISTS from_hercademy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hercademy_cohort text;

-- 2. Intern Match windows (quarterly cohorts)
CREATE TABLE IF NOT EXISTS public.intern_match_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_name text NOT NULL,
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intern_match_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active windows"
  ON public.intern_match_windows FOR SELECT
  USING (is_active = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage windows"
  ON public.intern_match_windows FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_intern_match_windows_updated_at
  BEFORE UPDATE ON public.intern_match_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Intern Match applications (founder side)
CREATE TABLE IF NOT EXISTS public.intern_match_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_user_id uuid NOT NULL,
  cohort_id uuid REFERENCES public.intern_match_windows(id) ON DELETE SET NULL,
  role_title text NOT NULL,
  role_description text NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  weekly_hours integer,
  duration_weeks integer,
  stipend_naira integer,
  success_criteria text,
  additional_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','waitlist','matched','closed')),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intern_match_apps_recruiter ON public.intern_match_applications(recruiter_user_id);
CREATE INDEX IF NOT EXISTS idx_intern_match_apps_cohort ON public.intern_match_applications(cohort_id);
CREATE INDEX IF NOT EXISTS idx_intern_match_apps_status ON public.intern_match_applications(status);

ALTER TABLE public.intern_match_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own intern match applications"
  ON public.intern_match_applications FOR SELECT
  USING (auth.uid() = recruiter_user_id);

CREATE POLICY "Recruiters insert own intern match applications"
  ON public.intern_match_applications FOR INSERT
  WITH CHECK (auth.uid() = recruiter_user_id);

CREATE POLICY "Recruiters update own pending applications"
  ON public.intern_match_applications FOR UPDATE
  USING (auth.uid() = recruiter_user_id AND status = 'pending')
  WITH CHECK (auth.uid() = recruiter_user_id);

CREATE POLICY "Admins manage all intern match applications"
  ON public.intern_match_applications FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_intern_match_applications_updated_at
  BEFORE UPDATE ON public.intern_match_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();