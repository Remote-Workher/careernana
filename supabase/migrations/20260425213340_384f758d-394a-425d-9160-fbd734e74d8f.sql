ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_steps text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean NOT NULL DEFAULT false;