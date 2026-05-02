ALTER TABLE public.recruiter_jobs
ADD COLUMN IF NOT EXISTS application_deadline timestamp with time zone;