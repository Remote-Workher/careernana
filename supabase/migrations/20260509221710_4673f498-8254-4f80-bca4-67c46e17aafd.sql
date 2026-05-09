-- Add company verification workflow to recruiter_profiles.
-- Recruiters must be verified by an admin before they can post jobs.

ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- Existing recruiters that have already been posting are grandfathered as
-- verified so their flow doesn't break.
UPDATE public.recruiter_profiles rp
SET verification_status = 'verified',
    verified_at = COALESCE(verified_at, now())
WHERE verification_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.recruiter_jobs j WHERE j.user_id = rp.user_id
  );

-- Allow admins to update recruiter_profiles (for verification approval/rejection)
DROP POLICY IF EXISTS "Admins update all recruiters" ON public.recruiter_profiles;
CREATE POLICY "Admins update all recruiters"
  ON public.recruiter_profiles
  FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_verification
  ON public.recruiter_profiles(verification_status);