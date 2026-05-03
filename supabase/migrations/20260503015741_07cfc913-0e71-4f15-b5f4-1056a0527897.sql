ALTER TABLE public.accountability_prefs
  ADD COLUMN IF NOT EXISTS goal_type text,
  ADD COLUMN IF NOT EXISTS goal_timeline text,
  ADD COLUMN IF NOT EXISTS career_stage text,
  ADD COLUMN IF NOT EXISTS target_industry text,
  ADD COLUMN IF NOT EXISTS current_position text;