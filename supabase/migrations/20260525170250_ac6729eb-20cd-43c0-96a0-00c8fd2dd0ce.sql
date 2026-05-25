
-- 1) Drop the overly-permissive public policy
DROP POLICY IF EXISTS "Public can view recruiter company info" ON public.recruiter_profiles;

-- 2) Public-safe view (column-restricted). Runs as view owner -> bypasses RLS,
--    but only exposes non-sensitive company fields.
DROP VIEW IF EXISTS public.recruiter_profiles_public;
CREATE VIEW public.recruiter_profiles_public
WITH (security_barrier = true) AS
SELECT
  id,
  user_id,
  company_name,
  company_logo_url,
  company_description,
  company_website,
  company_size,
  industry,
  culture,
  hiring_process,
  mission,
  role_title,
  linkedin_url,
  twitter_url,
  instagram_url,
  facebook_url,
  youtube_url,
  verification_status,
  verified_at,
  created_at
FROM public.recruiter_profiles;

GRANT SELECT ON public.recruiter_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.recruiter_profiles_public IS
  'Public, column-restricted view of recruiter_profiles. Excludes email, phone, contact_name, verification_notes, onboarding_*.';

-- 3) Secure RPC for Intern Match: returns founder contact only to talents
--    who have an active assignment with that founder.
CREATE OR REPLACE FUNCTION public.get_recruiter_contact_for_intern_match(_recruiter_user_id uuid)
RETURNS TABLE(email text, contact_name text, company_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_match boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.intern_match_assignments a
    JOIN public.intern_match_applications b ON b.id = a.brief_id
    WHERE a.talent_user_id = _uid
      AND b.recruiter_user_id = _recruiter_user_id
  ) INTO _has_match;

  IF NOT _has_match THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT rp.email, rp.contact_name, rp.company_name
  FROM public.recruiter_profiles rp
  WHERE rp.user_id = _recruiter_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recruiter_contact_for_intern_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiter_contact_for_intern_match(uuid) TO authenticated;
