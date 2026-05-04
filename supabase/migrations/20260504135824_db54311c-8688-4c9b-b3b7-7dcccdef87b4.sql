-- Hard idempotency ledger for monthly coin grants
CREATE TABLE IF NOT EXISTS public.monthly_coin_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_month date NOT NULL,
  tier text NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);

ALTER TABLE public.monthly_coin_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own grant history"
  ON public.monthly_coin_grants FOR SELECT
  USING (auth.uid() = user_id);

-- Replace grant function with hard-lock version
CREATE OR REPLACE FUNCTION public.grant_monthly_coins()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _paid_until timestamptz;
  _allowance int;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _period date := date_trunc('month', _today)::date;
  _new_balance int;
  _inserted boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_authenticated');
  END IF;

  SELECT plan_tier::text, paid_until
    INTO _tier, _paid_until
  FROM public.profiles WHERE user_id = _uid;

  IF _tier IS NULL OR _tier = 'free' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'no_membership');
  END IF;

  IF _paid_until IS NOT NULL AND _paid_until < now() THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'membership_expired');
  END IF;

  _allowance := CASE WHEN _tier = 'premium' THEN 200 ELSE 50 END;

  -- Hard lock: insert into ledger. Unique (user_id, period_month) guarantees
  -- only one row per month per user, even under concurrent calls.
  BEGIN
    INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount)
    VALUES (_uid, _period, _tier, _allowance);
    _inserted := true;
  EXCEPTION WHEN unique_violation THEN
    _inserted := false;
  END;

  IF NOT _inserted THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted_this_month');
  END IF;

  UPDATE public.profiles
  SET tokens_remaining = COALESCE(tokens_remaining, 0) + _allowance,
      last_monthly_grant = _today,
      updated_at = now()
  WHERE user_id = _uid
  RETURNING tokens_remaining INTO _new_balance;

  RETURN jsonb_build_object(
    'granted', true,
    'tier', _tier,
    'amount', _allowance,
    'new_balance', _new_balance
  );
END;
$function$;

-- Backfill ledger for users who already received this month's grant
INSERT INTO public.monthly_coin_grants (user_id, period_month, tier, amount)
SELECT
  user_id,
  date_trunc('month', last_monthly_grant)::date,
  COALESCE(plan_tier::text, 'standard'),
  CASE WHEN plan_tier::text = 'premium' THEN 200 ELSE 50 END
FROM public.profiles
WHERE last_monthly_grant IS NOT NULL
ON CONFLICT (user_id, period_month) DO NOTHING;