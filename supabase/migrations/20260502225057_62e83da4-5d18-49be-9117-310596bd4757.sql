CREATE TABLE public.skills_gap_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_role text NOT NULL,
  job_description text,
  job_id uuid,
  current_skills text[] NOT NULL DEFAULT '{}',
  required_skills text[] NOT NULL DEFAULT '{}',
  match_score integer NOT NULL DEFAULT 0,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills_gap_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analyses" ON public.skills_gap_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own analyses" ON public.skills_gap_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own analyses" ON public.skills_gap_analyses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_skills_gap_user ON public.skills_gap_analyses(user_id, created_at DESC);