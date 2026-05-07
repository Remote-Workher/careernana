
-- 1) Move pg_net extension out of public schema (requires drop + recreate)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 2) Drop broad SELECT policies on public storage buckets.
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Company logos are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Resource files are publicly readable" ON storage.objects;

-- 3) Revoke EXECUTE on internal trigger / event functions
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'increment_recruiter_applications_count()',
    'update_updated_at_column()',
    'generate_referral_code()',
    'log_application_submitted()',
    'bump_reaction_count()',
    'log_application_status_change()',
    'log_application_email_sent()',
    'set_referral_code()',
    'bump_post_reply_count()',
    'notify_new_class()',
    'notify_new_live_session()',
    'handle_new_user()',
    'notify_low_coins()',
    'recompute_course_rating()',
    'sync_profile_vetted_on_application()',
    'auto_advance_status_on_event()',
    'notify_application_status_change()',
    'notify_community_reply()'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- 4) Restrict user-callable RPCs to authenticated only
DO $$
DECLARE
  fn text;
  rpc_fns text[] := ARRAY[
    'consume_tokens(integer)',
    'consume_member_quota(text)',
    'consume_member_quota(text, text)',
    'grant_monthly_coins()',
    'mark_application_event(uuid, text)',
    'record_referral_payout(uuid, text, integer)',
    'request_application_follow_up(uuid, text)',
    'get_recruiter_company_info(uuid[])'
  ];
BEGIN
  FOREACH fn IN ARRAY rpc_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;

-- 5) RLS helper functions — must remain callable for policies to evaluate
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_paid_recruiter(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_partnership(uuid) TO anon, authenticated;
