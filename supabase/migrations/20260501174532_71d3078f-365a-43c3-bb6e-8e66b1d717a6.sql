CREATE TABLE public.lesson_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  lesson_id text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, lesson_id)
);

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lesson notes" ON public.lesson_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lesson notes" ON public.lesson_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lesson notes" ON public.lesson_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own lesson notes" ON public.lesson_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_lesson_notes_user_course ON public.lesson_notes (user_id, course_id);

CREATE TRIGGER update_lesson_notes_updated_at
  BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();