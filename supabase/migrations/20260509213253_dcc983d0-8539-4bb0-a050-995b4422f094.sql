-- Ensure the avatars bucket is public for profile photo display
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- Replace avatar storage rules with authenticated-user policies that work for normal uploads and upserts.
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR owner = auth.uid()
    OR owner_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
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