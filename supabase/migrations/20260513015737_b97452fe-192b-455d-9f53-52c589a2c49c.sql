CREATE OR REPLACE FUNCTION private.grant_monthly_coins_impl()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _tier text; _plan_key text; _paid_until timestamptz; _allowance int;
        _today date := current_date; _period date := date_trunc('month', current_date)::date;
        _last date; _new_balance int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('granted', false, 'reason', 'not_authenticated'); END IF;
  SELECT plan_tier::text, plan_key, paid_until, last_monthly_grant
    INTO _tier, _plan_key, _paid_until, _last
    FROM public.profiles WHERE user_id = _uid;
  IF _tier IS NULL OR _tier = 'free' THEN RETURN jsonb_build_object('granted', false, 'reason', 'not_member'); END IF;
  IF _paid_until IS NOT NULL AND _paid_until < now() THEN RETURN jsonb_build_object('granted', false, 'reason', 'expired'); END IF;
  IF _last IS NOT NULL AND date_trunc('month', _last)::date = _period THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month');
  END IF;
  -- Coin allowance per plan_key:
  --   quarterly / yearly => 200 coins / month
  --   monthly (and "trial" alias) => 100 coins / month
  --   Legacy fallback: tier='premium' with no plan_key => 200 (old "pro" plan)
  _allowance := CASE
    WHEN _plan_key IN ('quarterly', 'yearly') THEN 200
    WHEN _plan_key IN ('monthly', 'trial') THEN 100
    WHEN _plan_key IS NULL AND _tier = 'premium' THEN 200
    ELSE 100
  END;
  BEGIN
    INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount) VALUES (_uid, _period, _tier, _allowance);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month');
  END;
  UPDATE public.profiles SET tokens_remaining = COALESCE(tokens_remaining,0) + _allowance,
                              last_monthly_grant = _today, updated_at = now()
   WHERE user_id = _uid RETURNING tokens_remaining INTO _new_balance;
  RETURN jsonb_build_object('granted', true, 'tier', _tier, 'plan_key', _plan_key, 'amount', _allowance, 'new_balance', _new_balance);
END $$;