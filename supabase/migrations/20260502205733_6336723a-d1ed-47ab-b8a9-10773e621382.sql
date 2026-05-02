
-- ============================================================
-- Job Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  keywords text NOT NULL DEFAULT '',
  location text,
  work_type text,
  experience_level text,
  frequency text NOT NULL DEFAULT 'weekly',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own job alerts"
  ON public.job_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own job alerts"
  ON public.job_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own job alerts"
  ON public.job_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own job alerts"
  ON public.job_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON public.job_alerts(user_id);

CREATE TRIGGER update_job_alerts_updated_at
  BEFORE UPDATE ON public.job_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Challenge Progress
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_key text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_tasks integer[] NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_key)
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenge progress"
  ON public.challenge_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own challenge progress"
  ON public.challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own challenge progress"
  ON public.challenge_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own challenge progress"
  ON public.challenge_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON public.challenge_progress(user_id);

CREATE TRIGGER update_challenge_progress_updated_at
  BEFORE UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
