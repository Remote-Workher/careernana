
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_daily_digest_at timestamptz,
  ADD COLUMN IF NOT EXISTS vetting_prompt_sent_at timestamptz;

ALTER TABLE public.challenge_progress
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
