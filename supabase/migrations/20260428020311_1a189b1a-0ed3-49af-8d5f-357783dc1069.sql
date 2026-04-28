ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS resume_file_name text,
  ADD COLUMN IF NOT EXISTS profile_setup_completed boolean NOT NULL DEFAULT false;