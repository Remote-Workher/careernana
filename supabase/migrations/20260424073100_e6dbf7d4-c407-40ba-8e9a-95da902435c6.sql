CREATE OR REPLACE FUNCTION public.consume_tokens(_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _remaining integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _amount IS NULL OR _amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.profiles
  SET tokens_remaining = GREATEST(tokens_remaining - _amount, 0),
      updated_at = now()
  WHERE user_id = _uid
  RETURNING tokens_remaining INTO _remaining;

  IF _remaining IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  RETURN _remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_tokens(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_tokens(integer) TO authenticated;