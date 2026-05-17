-- Track founder-brief shortlists so vetted talents can see their own matches
CREATE TABLE public.intern_match_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.intern_match_applications(id) ON DELETE CASCADE,
  talent_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'shortlisted' CHECK (status IN ('shortlisted','introduced','accepted','declined','withdrawn')),
  intro_message text,
  admin_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brief_id, talent_user_id)
);

CREATE INDEX idx_intern_match_assignments_talent ON public.intern_match_assignments(talent_user_id);
CREATE INDEX idx_intern_match_assignments_brief ON public.intern_match_assignments(brief_id);

ALTER TABLE public.intern_match_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Talents view own assignments"
  ON public.intern_match_assignments FOR SELECT
  USING (auth.uid() = talent_user_id);

CREATE POLICY "Talents update own assignment status"
  ON public.intern_match_assignments FOR UPDATE
  USING (auth.uid() = talent_user_id)
  WITH CHECK (auth.uid() = talent_user_id);

CREATE POLICY "Recruiters view assignments to own briefs"
  ON public.intern_match_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.intern_match_applications b
    WHERE b.id = intern_match_assignments.brief_id
      AND b.recruiter_user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all assignments"
  ON public.intern_match_assignments FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_intern_match_assignments_updated_at
  BEFORE UPDATE ON public.intern_match_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();