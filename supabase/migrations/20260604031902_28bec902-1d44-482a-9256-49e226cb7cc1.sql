-- Backfill: mark all current paid talent users as having completed onboarding,
-- so the new post-payment onboarding flow only triggers for new signups going forward.
UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS DISTINCT FROM true
  AND paid_until IS NOT NULL;