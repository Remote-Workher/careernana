ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS host_role text,
  ADD COLUMN IF NOT EXISTS host_bio text,
  ADD COLUMN IF NOT EXISTS learnings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS recording_youtube_id text,
  ADD COLUMN IF NOT EXISTS attendees integer;