DROP POLICY IF EXISTS "Public can view recruiter company info" ON public.recruiter_profiles;

CREATE OR REPLACE FUNCTION public.get_recruiter_company_info(_user_ids uuid[])
RETURNS TABLE (user_id uuid, company_name text, company_logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, company_name, company_logo_url
  FROM public.recruiter_profiles
  WHERE user_id = ANY(_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_recruiter_company_info(uuid[]) TO anon, authenticated;