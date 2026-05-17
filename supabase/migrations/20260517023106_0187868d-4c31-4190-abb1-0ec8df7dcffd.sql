
ALTER TABLE public.intern_match_assignments
  DROP CONSTRAINT IF EXISTS intern_match_assignments_status_check;

ALTER TABLE public.intern_match_assignments
  ADD CONSTRAINT intern_match_assignments_status_check
  CHECK (status = ANY (ARRAY[
    'shortlisted','introduced','accepted','declined','withdrawn',
    'interested','not_interested','invited','rejected_by_founder'
  ]));

ALTER TABLE public.intern_match_assignments
  ADD COLUMN IF NOT EXISTS match_score integer,
  ADD COLUMN IF NOT EXISTS match_reasons jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invite_message text;

DROP POLICY IF EXISTS "Recruiters update own brief assignments" ON public.intern_match_assignments;
CREATE POLICY "Recruiters update own brief assignments"
ON public.intern_match_assignments
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.intern_match_applications b
  WHERE b.id = intern_match_assignments.brief_id
    AND b.recruiter_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.intern_match_applications b
  WHERE b.id = intern_match_assignments.brief_id
    AND b.recruiter_user_id = auth.uid()
));
