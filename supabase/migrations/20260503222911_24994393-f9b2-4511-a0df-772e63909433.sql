CREATE TABLE IF NOT EXISTS public.course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text,
  file_type text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views course resources of published courses"
ON public.course_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_resources.course_id
      AND (c.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins manage course resources"
ON public.course_resources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_course_resources_course ON public.course_resources(course_id);

CREATE TRIGGER update_course_resources_updated_at
BEFORE UPDATE ON public.course_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();