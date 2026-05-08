
CREATE OR REPLACE FUNCTION private.grant_monthly_coins_impl()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _tier text; _paid_until timestamptz; _allowance int;
        _today date := current_date; _period date := date_trunc('month', current_date)::date;
        _last date; _new_balance int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('granted', false, 'reason', 'not_authenticated'); END IF;
  SELECT plan_tier::text, paid_until, last_monthly_grant INTO _tier, _paid_until, _last
    FROM public.profiles WHERE user_id = _uid;
  IF _tier IS NULL OR _tier = 'free' THEN RETURN jsonb_build_object('granted', false, 'reason', 'not_member'); END IF;
  IF _paid_until IS NOT NULL AND _paid_until < now() THEN RETURN jsonb_build_object('granted', false, 'reason', 'expired'); END IF;
  IF _last IS NOT NULL AND date_trunc('month', _last)::date = _period THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month');
  END IF;
  _allowance := CASE WHEN _tier = 'premium' THEN 200 ELSE 100 END;
  BEGIN
    INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount) VALUES (_uid, _period, _tier, _allowance);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month');
  END;
  UPDATE public.profiles SET tokens_remaining = COALESCE(tokens_remaining,0) + _allowance,
                              last_monthly_grant = _today, updated_at = now()
   WHERE user_id = _uid RETURNING tokens_remaining INTO _new_balance;
  RETURN jsonb_build_object('granted', true, 'tier', _tier, 'amount', _allowance, 'new_balance', _new_balance);
END $$;

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
  _coins := CASE WHEN _plan_tier = 'premium' THEN 200 ELSE 100 END;
  INSERT INTO public.referrals (referrer_user_id, referee_user_id, referrer_code, plan_tier, coins_awarded, paid_amount_naira)
  VALUES (_referrer_id, _referee_user_id, _referrer_code, _plan_tier, _coins, _paid_amount_naira);
  UPDATE public.profiles SET tokens_remaining = COALESCE(tokens_remaining,0) + _coins, updated_at = now() WHERE user_id = _referrer_id;
  RETURN jsonb_build_object('paid', true, 'referrer_id', _referrer_id, 'coins', _coins);
END $$;
