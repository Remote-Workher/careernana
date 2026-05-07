ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS interview_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_job_apps_recruiter_status ON public.job_applications(recruiter_user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_apps_interview_at ON public.job_applications(interview_at) WHERE interview_at IS NOT NULL;