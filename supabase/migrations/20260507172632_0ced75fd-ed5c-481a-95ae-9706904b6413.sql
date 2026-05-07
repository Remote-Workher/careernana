
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ai_match_score integer,
  ADD COLUMN IF NOT EXISTS ai_match_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS ai_match_scored_at timestamptz;
