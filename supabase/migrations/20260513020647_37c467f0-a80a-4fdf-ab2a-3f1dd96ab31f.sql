-- Make company-logos upload policies robust (handle upsert which also runs UPDATE)
DROP POLICY IF EXISTS "Recruiters upload own company logo" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters update own company logo" ON storage.objects;
DROP POLICY IF EXISTS "Recruiters delete own company logo" ON storage.objects;

CREATE POLICY "Recruiters upload own company logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = (auth.uid())::text
  )
);

CREATE POLICY "Recruiters update own company logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = (auth.uid())::text
  )
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = (auth.uid())::text
  )
);

CREATE POLICY "Recruiters delete own company logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = (auth.uid())::text
  )
);