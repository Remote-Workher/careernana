INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Resource files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'resource-files');

CREATE POLICY "Admins can upload resource files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resource-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update resource files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resource-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete resource files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resource-files' AND public.has_role(auth.uid(), 'admin'));