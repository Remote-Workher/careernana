ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS segments TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_profiles_segments ON public.profiles USING GIN(segments);