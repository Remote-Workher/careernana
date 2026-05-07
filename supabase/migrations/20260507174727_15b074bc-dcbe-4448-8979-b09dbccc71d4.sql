
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_paid_recruiter(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.recruiter_payments WHERE user_id = _uid AND status = 'success') $$;

CREATE OR REPLACE FUNCTION private.current_partnership(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.accountability_partnerships
      WHERE status = 'active' AND _uid IN (user_a, user_b)
      ORDER BY created_at DESC LIMIT 1 $$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_paid_recruiter(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.current_partnership(uuid) TO authenticated, anon;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_paid_recruiter(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.current_partnership(uuid) CASCADE;

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views published sessions" ON public.live_sessions
  FOR SELECT USING ((is_published = true) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage sessions" ON public.live_sessions
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views published courses" ON public.courses
  FOR SELECT USING ((is_published = true) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views published challenges" ON public.challenges
  FOR SELECT USING ((is_published = true) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage challenges" ON public.challenges
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views published resources" ON public.resources
  FOR SELECT USING ((is_published = true) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage resources" ON public.resources
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Paid recruiters view opted-in talent" ON public.profiles
  FOR SELECT USING (
    open_to_recruiters = true
    AND profile_setup_completed = true
    AND private.is_paid_recruiter(auth.uid())
  );
CREATE POLICY "Admins update vetting" ON public.profiles
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all recruiters" ON public.recruiter_profiles
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all hire requests" ON public.hire_for_me_requests
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all hire requests" ON public.hire_for_me_requests
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all jobs" ON public.recruiter_jobs
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all jobs" ON public.recruiter_jobs
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views active channels" ON public.community_channels
  FOR SELECT USING ((is_active = true) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage channels" ON public.community_channels
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members create posts in open channels" ON public.community_posts
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.community_channels c
                 WHERE c.id = community_posts.channel_id
                   AND c.admin_only_posting = false
                   AND c.is_active = true)
    )
  );
CREATE POLICY "Admins update any post" ON public.community_posts
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete any post" ON public.community_posts
  FOR DELETE USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members reply unless locked" ON public.community_replies
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.community_posts p
                 WHERE p.id = community_replies.post_id
                   AND COALESCE(p.is_locked, false) = false)
    )
  );
CREATE POLICY "Admins delete any reply" ON public.community_replies
  FOR DELETE USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all reports" ON public.community_reports
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update reports" ON public.community_reports
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all payments" ON public.recruiter_payments
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all talent payments" ON public.talent_payments
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage external jobs" ON public.external_jobs
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view scopes" ON public.admin_scopes
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views challenge tasks" ON public.challenge_tasks
  FOR SELECT USING (true);
CREATE POLICY "Admins manage challenge tasks" ON public.challenge_tasks
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage course lessons" ON public.course_lessons
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone views lessons of published courses" ON public.course_lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_lessons.course_id AND c.is_published = true)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage classes" ON public.classes
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone views published classes" ON public.classes
  FOR SELECT USING ((is_published = true) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views course resources of published courses" ON public.course_resources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_resources.course_id AND c.is_published = true)
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admins manage course resources" ON public.course_resources
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all product purchases" ON public.product_purchases
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone views active categories" ON public.class_categories
  FOR SELECT USING ((is_active = true) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage categories" ON public.class_categories
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own vetting applications" ON public.vetting_applications
  FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage vetting applications" ON public.vetting_applications
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload class covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'class-covers' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update class covers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'class-covers' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete class covers" ON storage.objects
  FOR DELETE USING (bucket_id = 'class-covers' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can upload resource files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resource-files' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update resource files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'resource-files' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete resource files" ON storage.objects
  FOR DELETE USING (bucket_id = 'resource-files' AND private.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION private.consume_tokens_impl(_amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _remaining integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  UPDATE public.profiles SET tokens_remaining = GREATEST(tokens_remaining - _amount, 0), updated_at = now()
   WHERE user_id = _uid RETURNING tokens_remaining INTO _remaining;
  IF _remaining IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  RETURN _remaining;
END $$;
GRANT EXECUTE ON FUNCTION private.consume_tokens_impl(integer) TO authenticated;

DROP FUNCTION IF EXISTS public.consume_tokens(integer);
CREATE FUNCTION public.consume_tokens(_amount integer)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.consume_tokens_impl(_amount) $$;
REVOKE ALL ON FUNCTION public.consume_tokens(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_tokens(integer) TO authenticated;

CREATE OR REPLACE FUNCTION private.mark_application_event_impl(_application_id uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _app record; _recent timestamptz;
BEGIN
  IF _kind NOT IN ('application_opened','profile_viewed') THEN RAISE EXCEPTION 'invalid_kind'; END IF;
  SELECT applicant_user_id, recruiter_user_id INTO _app FROM public.job_applications WHERE id = _application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;
  IF auth.uid() IS DISTINCT FROM _app.recruiter_user_id THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT max(created_at) INTO _recent FROM public.application_events
    WHERE application_id = _application_id AND kind = _kind AND created_at > now() - interval '1 hour';
  IF _recent IS NULL THEN
    INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind)
    VALUES (_application_id, _app.applicant_user_id, _app.recruiter_user_id, _kind);
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION private.mark_application_event_impl(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.mark_application_event(uuid, text);
CREATE FUNCTION public.mark_application_event(_application_id uuid, _kind text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.mark_application_event_impl(_application_id, _kind) $$;
REVOKE ALL ON FUNCTION public.mark_application_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_application_event(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.get_recruiter_company_info_impl(_user_ids uuid[])
RETURNS TABLE(user_id uuid, company_name text, company_logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT user_id, company_name, company_logo_url FROM public.recruiter_profiles WHERE user_id = ANY(_user_ids) $$;
GRANT EXECUTE ON FUNCTION private.get_recruiter_company_info_impl(uuid[]) TO authenticated, anon;

DROP FUNCTION IF EXISTS public.get_recruiter_company_info(uuid[]);
CREATE FUNCTION public.get_recruiter_company_info(_user_ids uuid[])
RETURNS TABLE(user_id uuid, company_name text, company_logo_url text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM private.get_recruiter_company_info_impl(_user_ids) $$;
REVOKE ALL ON FUNCTION public.get_recruiter_company_info(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiter_company_info(uuid[]) TO authenticated, anon;

CREATE OR REPLACE FUNCTION private.grant_monthly_coins_impl()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _tier text; _paid_until timestamptz; _allowance int;
        _today date := (now() AT TIME ZONE 'UTC')::date;
        _period date := date_trunc('month', _today)::date;
        _new_balance int; _inserted boolean := false;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('granted', false, 'reason', 'not_authenticated'); END IF;
  SELECT plan_tier::text, paid_until INTO _tier, _paid_until FROM public.profiles WHERE user_id = _uid;
  IF _tier IS NULL OR _tier = 'free' THEN RETURN jsonb_build_object('granted', false, 'reason', 'no_membership'); END IF;
  IF _paid_until IS NOT NULL AND _paid_until < now() THEN RETURN jsonb_build_object('granted', false, 'reason', 'membership_expired'); END IF;
  _allowance := CASE WHEN _tier = 'premium' THEN 200 ELSE 50 END;
  BEGIN
    INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount) VALUES (_uid, _period, _tier, _allowance);
    _inserted := true;
  EXCEPTION WHEN unique_violation THEN _inserted := false; END;
  IF NOT _inserted THEN RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month'); END IF;
  UPDATE public.profiles SET tokens_remaining = COALESCE(tokens_remaining,0) + _allowance,
                              last_monthly_grant = _today, updated_at = now()
   WHERE user_id = _uid RETURNING tokens_remaining INTO _new_balance;
  RETURN jsonb_build_object('granted', true, 'tier', _tier, 'amount', _allowance, 'new_balance', _new_balance);
END $$;
GRANT EXECUTE ON FUNCTION private.grant_monthly_coins_impl() TO authenticated;

DROP FUNCTION IF EXISTS public.grant_monthly_coins();
CREATE FUNCTION public.grant_monthly_coins()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.grant_monthly_coins_impl() $$;
REVOKE ALL ON FUNCTION public.grant_monthly_coins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_monthly_coins() TO authenticated;

CREATE OR REPLACE FUNCTION private.request_application_follow_up_impl(_application_id uuid, _message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _app record; _last timestamptz; _coins int; _new_coins int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id, applicant_user_id, recruiter_user_id, created_at INTO _app FROM public.job_applications WHERE id = _application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;
  IF _app.applicant_user_id IS DISTINCT FROM _uid THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT max(created_at) INTO _last FROM public.application_events
   WHERE application_id = _application_id AND kind = 'follow_up_request';
  IF _last IS NOT NULL AND _last > now() - interval '3 days' THEN
    RETURN jsonb_build_object('sent', false, 'reason', 'cooldown', 'next_available_at', _last + interval '3 days');
  END IF;
  SELECT tokens_remaining INTO _coins FROM public.profiles WHERE user_id = _uid;
  IF COALESCE(_coins, 0) < 2 THEN
    RETURN jsonb_build_object('sent', false, 'reason', 'insufficient_coins', 'balance', COALESCE(_coins,0));
  END IF;
  UPDATE public.profiles SET tokens_remaining = GREATEST(tokens_remaining - 2, 0), updated_at = now()
   WHERE user_id = _uid RETURNING tokens_remaining INTO _new_coins;
  INSERT INTO public.application_events (application_id, applicant_user_id, recruiter_user_id, kind, payload)
  VALUES (_application_id, _uid, _app.recruiter_user_id, 'follow_up_request',
          jsonb_build_object('message', COALESCE(_message,''), 'cost_coins', 2));
  RETURN jsonb_build_object('sent', true, 'new_balance', _new_coins);
END $$;
GRANT EXECUTE ON FUNCTION private.request_application_follow_up_impl(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.request_application_follow_up(uuid, text);
CREATE FUNCTION public.request_application_follow_up(_application_id uuid, _message text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.request_application_follow_up_impl(_application_id, _message) $$;
REVOKE ALL ON FUNCTION public.request_application_follow_up(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_application_follow_up(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.record_referral_payout_impl(_referee_user_id uuid, _plan_tier text, _paid_amount_naira integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _referrer_code text; _referrer_id uuid; _coins int; _existing int;
BEGIN
  IF _plan_tier NOT IN ('standard','premium') THEN RETURN jsonb_build_object('paid', false, 'reason', 'invalid_plan'); END IF;
  SELECT referred_by_code INTO _referrer_code FROM public.profiles WHERE user_id = _referee_user_id;
  IF _referrer_code IS NULL OR _referrer_code = '' THEN RETURN jsonb_build_object('paid', false, 'reason', 'no_referrer'); END IF;
  SELECT user_id INTO _referrer_id FROM public.profiles WHERE referral_code = _referrer_code;
  IF _referrer_id IS NULL THEN RETURN jsonb_build_object('paid', false, 'reason', 'referrer_not_found'); END IF;
  IF _referrer_id = _referee_user_id THEN RETURN jsonb_build_object('paid', false, 'reason', 'self_referral'); END IF;
  SELECT count(*) INTO _existing FROM public.referrals WHERE referee_user_id = _referee_user_id AND plan_tier = _plan_tier;
  IF _existing > 0 THEN RETURN jsonb_build_object('paid', false, 'reason', 'already_paid'); END IF;
  _coins := CASE WHEN _plan_tier = 'premium' THEN 200 ELSE 50 END;
  INSERT INTO public.referrals (referrer_user_id, referee_user_id, referrer_code, plan_tier, coins_awarded, paid_amount_naira)
  VALUES (_referrer_id, _referee_user_id, _referrer_code, _plan_tier, _coins, _paid_amount_naira);
  UPDATE public.profiles SET tokens_remaining = COALESCE(tokens_remaining,0) + _coins, updated_at = now() WHERE user_id = _referrer_id;
  RETURN jsonb_build_object('paid', true, 'referrer_id', _referrer_id, 'coins', _coins);
END $$;
GRANT EXECUTE ON FUNCTION private.record_referral_payout_impl(uuid, text, integer) TO service_role;

DROP FUNCTION IF EXISTS public.record_referral_payout(uuid, text, integer);
CREATE FUNCTION public.record_referral_payout(_referee_user_id uuid, _plan_tier text, _paid_amount_naira integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.record_referral_payout_impl(_referee_user_id, _plan_tier, _paid_amount_naira) $$;
REVOKE ALL ON FUNCTION public.record_referral_payout(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_payout(uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION private.consume_member_quota_impl(_kind text, _resource_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _tier public.plan_tier; _paid_until timestamptz;
        _period date := date_trunc('month', now())::date;
        _row public.member_monthly_usage%ROWTYPE; _used integer;
        _limit constant integer := 3; _already_unlocked boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _kind NOT IN ('resource', 'course') THEN RAISE EXCEPTION 'invalid_kind'; END IF;
  SELECT plan_tier, paid_until INTO _tier, _paid_until FROM public.profiles WHERE user_id = _uid;
  IF _tier IS NULL OR _tier = 'free' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_membership', 'tier', _tier); END IF;
  IF _tier = 'standard' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'tier_locked', 'tier', _tier); END IF;
  IF _paid_until IS NOT NULL AND _paid_until < now() THEN RETURN jsonb_build_object('allowed', false, 'reason', 'membership_expired', 'tier', _tier); END IF;
  IF _resource_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.resource_unlocks WHERE user_id = _uid AND kind = _kind AND resource_id = _resource_id)
      INTO _already_unlocked;
    IF _already_unlocked THEN
      SELECT * INTO _row FROM public.member_monthly_usage WHERE user_id = _uid AND period_month = _period;
      IF _kind = 'resource' THEN _used := COALESCE(_row.resources_used, 0); ELSE _used := COALESCE(_row.courses_used, 0); END IF;
      RETURN jsonb_build_object('allowed', true, 'tier', _tier, 'used', _used, 'limit', _limit, 'already_unlocked', true);
    END IF;
  END IF;
  INSERT INTO public.member_monthly_usage (user_id, period_month) VALUES (_uid, _period) ON CONFLICT (user_id, period_month) DO NOTHING;
  SELECT * INTO _row FROM public.member_monthly_usage WHERE user_id = _uid AND period_month = _period FOR UPDATE;
  IF _kind = 'resource' THEN _used := _row.resources_used; ELSE _used := _row.courses_used; END IF;
  IF _used >= _limit THEN RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached', 'tier', _tier, 'used', _used, 'limit', _limit); END IF;
  IF _kind = 'resource' THEN
    UPDATE public.member_monthly_usage SET resources_used = resources_used + 1, updated_at = now() WHERE user_id = _uid AND period_month = _period;
  ELSE
    UPDATE public.member_monthly_usage SET courses_used = courses_used + 1, updated_at = now() WHERE user_id = _uid AND period_month = _period;
  END IF;
  IF _resource_id IS NOT NULL THEN
    INSERT INTO public.resource_unlocks (user_id, resource_id, kind) VALUES (_uid, _resource_id, _kind)
    ON CONFLICT (user_id, kind, resource_id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('allowed', true, 'tier', _tier, 'used', _used + 1, 'limit', _limit, 'already_unlocked', false);
END $$;
GRANT EXECUTE ON FUNCTION private.consume_member_quota_impl(text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.consume_member_quota(text);
DROP FUNCTION IF EXISTS public.consume_member_quota(text, text);

CREATE FUNCTION public.consume_member_quota(_kind text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.consume_member_quota_impl(_kind, NULL) $$;
REVOKE ALL ON FUNCTION public.consume_member_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_member_quota(text) TO authenticated;

CREATE FUNCTION public.consume_member_quota(_kind text, _resource_id text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.consume_member_quota_impl(_kind, _resource_id) $$;
REVOKE ALL ON FUNCTION public.consume_member_quota(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_member_quota(text, text) TO authenticated;
