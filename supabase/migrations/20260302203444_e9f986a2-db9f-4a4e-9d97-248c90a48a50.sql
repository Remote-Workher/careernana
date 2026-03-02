
-- Add personalization fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "current_role" text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_salary_range text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_role text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_salary_min integer;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS career_goal text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_years integer;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS struggle_areas text[];
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_search_status text DEFAULT 'exploring';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS career_persona text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work_preference text[];
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "location" text;

-- Create external_jobs table for API-ingested jobs
CREATE TABLE public.external_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text,
  source_url text NOT NULL UNIQUE,
  job_title text NOT NULL,
  company text NOT NULL,
  company_logo_url text,
  "location" text,
  work_type text,
  salary_min integer,
  salary_max integer,
  salary_raw text,
  experience_level text,
  skills text[],
  description text,
  requirements text,
  benefits text,
  posted_date timestamptz,
  expires_date timestamptz,
  is_active boolean DEFAULT true,
  ingested_at timestamptz DEFAULT now()
);

ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active jobs"
  ON public.external_jobs FOR SELECT
  USING (is_active = true);

-- Create job_user_matches table
CREATE TABLE public.job_user_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.external_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  match_score integer,
  skill_match_score integer,
  location_match_score integer,
  experience_match_score integer,
  missing_skills text[],
  matching_skills text[],
  computed_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

ALTER TABLE public.job_user_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON public.job_user_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matches"
  ON public.job_user_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own matches"
  ON public.job_user_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create linkedin-pdfs storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('linkedin-pdfs', 'linkedin-pdfs', false);

CREATE POLICY "Users can upload own LinkedIn PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'linkedin-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own LinkedIn PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'linkedin-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
