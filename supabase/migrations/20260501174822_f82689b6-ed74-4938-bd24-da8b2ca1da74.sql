CREATE POLICY "Public can view recruiter company info"
ON public.recruiter_profiles
FOR SELECT
USING (true);