
-- Add location to vetting applications
ALTER TABLE public.vetting_applications
  ADD COLUMN IF NOT EXISTS location text;

-- Ensure profiles has a location column (it may already)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text;

-- Public bucket for vetting resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('vetting-resumes', 'vetting-resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read uploaded resumes (recruiters/admins need access)
CREATE POLICY "Public read vetting resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'vetting-resumes');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own vetting resume"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vetting-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own vetting resume"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vetting-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own vetting resume"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vetting-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
