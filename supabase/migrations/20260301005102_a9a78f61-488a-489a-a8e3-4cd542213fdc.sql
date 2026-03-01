
-- Profiles table with tokens and roadmap
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  job_title TEXT,
  city TEXT,
  years_experience TEXT,
  linkedin_url TEXT,
  phone TEXT,
  tokens_remaining INTEGER NOT NULL DEFAULT 25,
  plan_day INTEGER NOT NULL DEFAULT 1,
  roadmap_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Brag entries table
CREATE TABLE public.brag_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('impact', 'leadership', 'problem', 'collaboration')),
  raw_text TEXT NOT NULL,
  polished_text TEXT,
  company TEXT,
  strength_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brag_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brags" ON public.brag_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brags" ON public.brag_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brags" ON public.brag_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brags" ON public.brag_entries FOR DELETE USING (auth.uid() = user_id);

-- Saved jobs table
CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  salary TEXT,
  match_score INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  location TEXT,
  description TEXT,
  status TEXT DEFAULT 'saved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.saved_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.saved_jobs FOR DELETE USING (auth.uid() = user_id);

-- Resume versions table
CREATE TABLE public.resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT,
  source_type TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  ats_score INTEGER DEFAULT 0,
  brag_entry_ids UUID[] DEFAULT '{}',
  job_id UUID REFERENCES public.saved_jobs(id),
  template TEXT DEFAULT 'classic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resumes" ON public.resume_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON public.resume_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own resumes" ON public.resume_versions FOR DELETE USING (auth.uid() = user_id);

-- Cover letters table
CREATE TABLE public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.saved_jobs(id),
  brag_entry_ids UUID[] DEFAULT '{}',
  generated_content TEXT NOT NULL,
  tone TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own letters" ON public.cover_letters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own letters" ON public.cover_letters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own letters" ON public.cover_letters FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brag_entries_updated_at BEFORE UPDATE ON public.brag_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
