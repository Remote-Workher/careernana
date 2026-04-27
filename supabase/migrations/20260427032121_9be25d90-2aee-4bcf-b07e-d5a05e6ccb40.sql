ALTER TABLE public.recruiter_jobs
  ADD COLUMN IF NOT EXISTS screening_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS screening_answers jsonb NOT NULL DEFAULT '[]'::jsonb;