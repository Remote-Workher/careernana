CREATE POLICY "Recruiters view profiles of own applicants"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_applications ja
    WHERE ja.applicant_user_id = profiles.user_id
      AND ja.recruiter_user_id = auth.uid()
  )
);