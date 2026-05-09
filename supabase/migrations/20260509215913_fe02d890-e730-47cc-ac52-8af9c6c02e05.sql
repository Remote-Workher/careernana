-- Remove all free-tier accounts. Free signup is being eliminated platform-wide.
-- A "free" account is any profile that has never had an active paid plan
-- (plan_tier is null or 'free' AND paid_until is null or expired).

DO $$
DECLARE
  _ids uuid[];
BEGIN
  SELECT array_agg(user_id) INTO _ids
  FROM public.profiles
  WHERE COALESCE(plan_tier, 'free') = 'free'
    AND (paid_until IS NULL OR paid_until < now());

  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RAISE NOTICE 'No free accounts to delete.';
    RETURN;
  END IF;

  -- Wipe talent-side data tied to these users (FKs aren't enforced everywhere).
  DELETE FROM public.applications        WHERE user_id = ANY(_ids);
  DELETE FROM public.brag_entries        WHERE user_id = ANY(_ids);
  DELETE FROM public.cover_letters       WHERE user_id = ANY(_ids);
  DELETE FROM public.challenge_progress  WHERE user_id = ANY(_ids);
  DELETE FROM public.profiles            WHERE user_id = ANY(_ids);

  -- Finally remove auth users — this also clears any remaining cascaded rows.
  DELETE FROM auth.users WHERE id = ANY(_ids);

  RAISE NOTICE 'Deleted % free accounts.', array_length(_ids, 1);
END $$;