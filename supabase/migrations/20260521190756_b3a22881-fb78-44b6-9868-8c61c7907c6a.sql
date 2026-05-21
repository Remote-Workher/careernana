
-- Disable the AI coins economy: top up every member to a very high balance,
-- and turn consume_tokens into a no-op that always reports plenty remaining.
UPDATE public.profiles SET tokens_remaining = 999999 WHERE tokens_remaining IS NOT NULL AND tokens_remaining < 999999;

CREATE OR REPLACE FUNCTION private.consume_tokens_impl(_amount integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN 999999;
  END IF;
  -- Keep balance high so any UI/legacy checks pass.
  UPDATE public.profiles
    SET tokens_remaining = 999999
    WHERE user_id = _uid
      AND COALESCE(tokens_remaining, 0) < 999999;
  RETURN 999999;
END;
$$;
