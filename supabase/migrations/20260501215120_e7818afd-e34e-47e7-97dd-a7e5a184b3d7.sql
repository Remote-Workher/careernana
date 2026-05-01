CREATE OR REPLACE VIEW public.recruiter_company_public AS
SELECT
  user_id,
  company_name,
  company_logo_url,
  company_description,
  company_website,
  company_size,
  industry
FROM public.recruiter_profiles;

GRANT SELECT ON public.recruiter_company_public TO anon, authenticated;