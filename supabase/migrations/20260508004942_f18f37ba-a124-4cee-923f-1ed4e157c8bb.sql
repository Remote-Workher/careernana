
-- Tracks array on content tables
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS tracks text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tracks text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS tracks text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS tracks text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS tracks text[] NOT NULL DEFAULT '{}';

-- Primary track on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_track text;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_challenges_tracks ON public.challenges USING GIN (tracks);
CREATE INDEX IF NOT EXISTS idx_courses_tracks ON public.courses USING GIN (tracks);
CREATE INDEX IF NOT EXISTS idx_resources_tracks ON public.resources USING GIN (tracks);
CREATE INDEX IF NOT EXISTS idx_live_sessions_tracks ON public.live_sessions USING GIN (tracks);
CREATE INDEX IF NOT EXISTS idx_classes_tracks ON public.classes USING GIN (tracks);
