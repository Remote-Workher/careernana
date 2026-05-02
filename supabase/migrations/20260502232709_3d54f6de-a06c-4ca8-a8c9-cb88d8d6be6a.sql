CREATE POLICY "Admins manage external jobs"
ON public.external_jobs
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));