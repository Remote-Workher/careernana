ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'career_expert';

CREATE TABLE public.feedback_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'Other',
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  goal TEXT,
  audience TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view feedback posts"
ON public.feedback_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own feedback posts"
ON public.feedback_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback posts"
ON public.feedback_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can delete their own feedback posts"
ON public.feedback_posts FOR DELETE TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_feedback_posts_created_at ON public.feedback_posts (created_at DESC);
CREATE INDEX idx_feedback_posts_user_id ON public.feedback_posts (user_id);

CREATE TRIGGER trg_feedback_posts_updated_at
BEFORE UPDATE ON public.feedback_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.feedback_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feedback_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view feedback comments"
ON public.feedback_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments"
ON public.feedback_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.feedback_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can delete their own comments"
ON public.feedback_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_feedback_comments_post_id ON public.feedback_comments (post_id, created_at);
CREATE INDEX idx_feedback_comments_user_id ON public.feedback_comments (user_id);

CREATE TRIGGER trg_feedback_comments_updated_at
BEFORE UPDATE ON public.feedback_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.feedback_comments_bump_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feedback_posts
      SET comment_count = comment_count + 1, updated_at = now()
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feedback_posts
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feedback_comments_count_ins
AFTER INSERT ON public.feedback_comments
FOR EACH ROW EXECUTE FUNCTION public.feedback_comments_bump_count();

CREATE TRIGGER trg_feedback_comments_count_del
AFTER DELETE ON public.feedback_comments
FOR EACH ROW EXECUTE FUNCTION public.feedback_comments_bump_count();