-- 1. Recruiter profiles table (separate from talent profiles)
CREATE TABLE public.recruiter_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  contact_name TEXT,
  email TEXT,
  company_name TEXT,
  company_website TEXT,
  company_size TEXT,
  role_title TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view own profile"
ON public.recruiter_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can insert own profile"
ON public.recruiter_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can update own profile"
ON public.recruiter_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_recruiter_profiles_updated_at
BEFORE UPDATE ON public.recruiter_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Recruiter jobs table
CREATE TABLE public.recruiter_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  location TEXT,
  work_type TEXT,
  employment_type TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'NGN',
  skills TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  applications_count INTEGER NOT NULL DEFAULT 0,
  shortlisted_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view own jobs"
ON public.recruiter_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active recruiter jobs"
ON public.recruiter_jobs FOR SELECT
USING (status = 'active');

CREATE POLICY "Recruiters can insert own jobs"
ON public.recruiter_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can update own jobs"
ON public.recruiter_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can delete own jobs"
ON public.recruiter_jobs FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_recruiter_jobs_updated_at
BEFORE UPDATE ON public.recruiter_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_recruiter_jobs_user_id ON public.recruiter_jobs(user_id);
CREATE INDEX idx_recruiter_jobs_status ON public.recruiter_jobs(status);

-- 3. Update handle_new_user to route based on account_type metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', 'talent') = 'recruiter' THEN
    INSERT INTO public.recruiter_profiles (user_id, email, contact_name, company_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'contact_name', NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company_name', '')
    );
  ELSE
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();