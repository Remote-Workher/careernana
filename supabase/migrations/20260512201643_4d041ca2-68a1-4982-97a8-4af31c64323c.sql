ALTER TABLE public.external_jobs
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_linkedin_url text,
  ADD COLUMN IF NOT EXISTS company_twitter_url text,
  ADD COLUMN IF NOT EXISTS company_instagram_url text,
  ADD COLUMN IF NOT EXISTS company_facebook_url text,
  ADD COLUMN IF NOT EXISTS company_youtube_url text,
  ADD COLUMN IF NOT EXISTS company_about text,
  ADD COLUMN IF NOT EXISTS company_mission text,
  ADD COLUMN IF NOT EXISTS company_culture text,
  ADD COLUMN IF NOT EXISTS company_hiring_process text;