CREATE TABLE public.course_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course ratings"
  ON public.course_ratings FOR SELECT USING (true);

CREATE POLICY "Users insert own rating"
  ON public.course_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rating"
  ON public.course_ratings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own rating"
  ON public.course_ratings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_course_ratings_updated_at
  BEFORE UPDATE ON public.course_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_course_ratings_course ON public.course_ratings(course_id);

-- Recompute aggregate on the courses table
CREATE OR REPLACE FUNCTION public.recompute_course_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid := COALESCE(NEW.course_id, OLD.course_id);
  _avg numeric;
  _cnt integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0), COUNT(*)
    INTO _avg, _cnt
  FROM public.course_ratings WHERE course_id = _cid;
  UPDATE public.courses
    SET rating = _avg, reviews = _cnt, updated_at = now()
    WHERE id = _cid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_course_ratings_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.course_ratings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_course_rating();