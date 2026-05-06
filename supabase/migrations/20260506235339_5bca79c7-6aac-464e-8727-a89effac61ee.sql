CREATE TABLE IF NOT EXISTS public.vetting_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  years_experience integer,
  current_role_title text,
  top_skills text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  proudest_win text,
  why_vetted text,
  availability text,
  expected_salary_min integer,
  expected_salary_max integer,
  open_to_hire_for_me boolean NOT NULL DEFAULT true,
  resume_url text,
  portfolio_url text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vetting_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own vetting application"
  ON public.vetting_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own vetting applications"
  ON public.vetting_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users update own pending application"
  ON public.vetting_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage vetting applications"
  ON public.vetting_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_vetting_applications_updated_at
  BEFORE UPDATE ON public.vetting_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vetting_applications_user ON public.vetting_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_vetting_applications_status ON public.vetting_applications(status);

CREATE OR REPLACE FUNCTION public.sync_profile_vetted_on_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET vetted_status = 'pending', vetted_applied_at = now(), updated_at = now()
    WHERE user_id = NEW.user_id AND vetted_status <> 'approved';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET vetted_status = 'approved', vetted_at = now(), vetted_notes = NEW.reviewer_notes, updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.profiles
      SET vetted_status = 'rejected', vetted_notes = NEW.reviewer_notes, updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_profile_vetted
  AFTER INSERT OR UPDATE ON public.vetting_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_vetted_on_application();