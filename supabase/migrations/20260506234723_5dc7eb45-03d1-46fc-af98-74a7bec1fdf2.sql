ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vetted_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS vetted_at timestamptz,
  ADD COLUMN IF NOT EXISTS vetted_notes text,
  ADD COLUMN IF NOT EXISTS vetted_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS availability text,
  ADD COLUMN IF NOT EXISTS expected_salary_max integer,
  ADD COLUMN IF NOT EXISTS looking_for_role_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS open_to_recruiters boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_vetted_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_vetted_status_check
  CHECK (vetted_status IN ('none','pending','approved','rejected'));

CREATE OR REPLACE FUNCTION public.is_paid_recruiter(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruiter_payments
    WHERE user_id = _uid AND status = 'success'
  );
$$;

DROP POLICY IF EXISTS "Paid recruiters view opted-in talent" ON public.profiles;
CREATE POLICY "Paid recruiters view opted-in talent" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    open_to_recruiters = true
    AND profile_setup_completed = true
    AND public.is_paid_recruiter(auth.uid())
  );

DROP POLICY IF EXISTS "Admins update vetting" ON public.profiles;
CREATE POLICY "Admins update vetting" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));