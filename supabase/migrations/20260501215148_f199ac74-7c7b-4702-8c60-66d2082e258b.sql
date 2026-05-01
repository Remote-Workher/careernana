DROP VIEW IF EXISTS public.recruiter_company_public;

CREATE POLICY "Public can view recruiter company info"
ON public.recruiter_profiles
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE SELECT (email, phone, contact_name) ON public.recruiter_profiles FROM anon, authenticated;