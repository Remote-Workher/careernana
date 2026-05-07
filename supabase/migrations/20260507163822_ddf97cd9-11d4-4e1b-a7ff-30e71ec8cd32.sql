-- Bucket for recruiter company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Company logos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Authenticated users can upload only into a folder named after their uid
CREATE POLICY "Recruiters upload own company logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Recruiters update own company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Recruiters delete own company logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- New optional columns
ALTER TABLE public.recruiter_profiles
  ADD COLUMN IF NOT EXISTS culture text,
  ADD COLUMN IF NOT EXISTS hiring_process text;
