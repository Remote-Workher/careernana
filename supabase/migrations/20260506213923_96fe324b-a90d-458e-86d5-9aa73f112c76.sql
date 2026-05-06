
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS host_linkedin_url text,
  ADD COLUMN IF NOT EXISTS host_instagram_url text,
  ADD COLUMN IF NOT EXISTS host_tiktok_url text,
  ADD COLUMN IF NOT EXISTS host_youtube_url text,
  ADD COLUMN IF NOT EXISTS host_twitter_url text,
  ADD COLUMN IF NOT EXISTS host_website_url text;
