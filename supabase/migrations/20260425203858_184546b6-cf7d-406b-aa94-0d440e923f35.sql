ALTER TABLE public.hire_for_me_requests ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Recruiters can insert own hire requests" ON public.hire_for_me_requests;

CREATE POLICY "Anyone can submit hire requests"
ON public.hire_for_me_requests
FOR INSERT
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() = user_id)
);