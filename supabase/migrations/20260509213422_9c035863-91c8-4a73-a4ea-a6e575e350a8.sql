DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;

CREATE POLICY "Users can view their own avatar"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = auth.uid()::text
  )
);