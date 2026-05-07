
-- 1. Fix mutable search_path on generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  candidate text;
  exists_count int;
BEGIN
  LOOP
    candidate := upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
    SELECT count(*) INTO exists_count FROM public.profiles WHERE referral_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$function$;

-- 2. Revoke EXECUTE from PUBLIC/anon/authenticated on trigger-only SECURITY DEFINER functions
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.auto_advance_status_on_event()',
    'public.bump_post_reply_count()',
    'public.bump_reaction_count()',
    'public.handle_new_user()',
    'public.increment_recruiter_applications_count()',
    'public.log_application_email_sent()',
    'public.log_application_status_change()',
    'public.log_application_submitted()',
    'public.notify_application_status_change()',
    'public.notify_community_reply()',
    'public.notify_low_coins()',
    'public.notify_new_class()',
    'public.notify_new_live_session()',
    'public.set_referral_code()',
    'public.sync_profile_vetted_on_application()',
    'public.generate_referral_code()',
    'public.record_referral_payout(uuid, text, integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END$$;

-- 3. Tighten exposure on user-callable RPCs: revoke from anon, keep authenticated
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.consume_tokens(integer)',
    'public.consume_member_quota(text)',
    'public.consume_member_quota(text, text)',
    'public.grant_monthly_coins()',
    'public.mark_application_event(uuid, text)',
    'public.request_application_follow_up(uuid, text)',
    'public.has_role(uuid, app_role)',
    'public.is_paid_recruiter(uuid)',
    'public.current_partnership(uuid)',
    'public.get_recruiter_company_info(uuid[])'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END$$;

-- 4. Storage: drop broad SELECT (listing) policies on public buckets.
-- Public buckets remain readable by direct URL; we just block bucket listing via API.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can read class covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read community images" ON storage.objects;
DROP POLICY IF EXISTS "Public read vetting resumes" ON storage.objects;
