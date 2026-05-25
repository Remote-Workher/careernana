
-- Drop the previously created public view (had security-definer-view lint)
DROP VIEW IF EXISTS public.recruiter_profiles_public;

-- Safe public lookup: column-restricted by definition, callable by anon + authenticated.
CREATE OR REPLACE FUNCTION public.get_recruiter_public_info(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  company_name text,
  company_logo_url text,
  company_description text,
  company_website text,
  company_size text,
  industry text,
  culture text,
  hiring_process text,
  mission text,
  role_title text,
  linkedin_url text,
  twitter_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  verification_status text,
  verified_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.user_id,
    rp.company_name,
    rp.company_logo_url,
    rp.company_description,
    rp.company_website,
    rp.company_size,
    rp.industry,
    rp.culture,
    rp.hiring_process,
    rp.mission,
    rp.role_title,
    rp.linkedin_url,
    rp.twitter_url,
    rp.instagram_url,
    rp.facebook_url,
    rp.youtube_url,
    rp.verification_status,
    rp.verified_at
  FROM public.recruiter_profiles rp
  WHERE rp.user_id = ANY(_user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_recruiter_public_info(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiter_public_info(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.get_recruiter_public_info(uuid[]) IS
  'Safe public lookup for recruiter company info. Excludes email, phone, contact_name, verification_notes, onboarding_*.';
