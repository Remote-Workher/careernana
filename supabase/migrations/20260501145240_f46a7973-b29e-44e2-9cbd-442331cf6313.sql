-- Channels (admin-curated)
CREATE TABLE public.community_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  admin_only_posting boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active channels" ON public.community_channels FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage channels" ON public.community_channels FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text,
  body text NOT NULL,
  image_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  reaction_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_channel ON public.community_posts(channel_id, is_pinned DESC, created_at DESC);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Members create posts in open channels" ON public.community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.community_channels c WHERE c.id = channel_id AND c.admin_only_posting = false AND c.is_active = true)
    )
  );
CREATE POLICY "Authors update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins update any post" ON public.community_posts FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any post" ON public.community_posts FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Replies (flat)
CREATE TABLE public.community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  reaction_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_replies_post ON public.community_replies(post_id, created_at ASC);
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views replies" ON public.community_replies FOR SELECT USING (true);
CREATE POLICY "Members reply unless locked" ON public.community_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.is_locked = false)
    )
  );
CREATE POLICY "Authors delete own replies" ON public.community_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any reply" ON public.community_replies FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Reactions (likes); emoji column allows future emoji types
CREATE TABLE public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.community_replies(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_target CHECK ((post_id IS NOT NULL)::int + (reply_id IS NOT NULL)::int = 1),
  UNIQUE (user_id, post_id, reply_id, emoji)
);
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views reactions" ON public.community_reactions FOR SELECT USING (true);
CREATE POLICY "Users add own reactions" ON public.community_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own reactions" ON public.community_reactions FOR DELETE USING (auth.uid() = user_id);

-- Reports
CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.community_replies(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_target_report CHECK ((post_id IS NOT NULL)::int + (reply_id IS NOT NULL)::int = 1)
);
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members create reports" ON public.community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);
CREATE POLICY "Reporters view own reports" ON public.community_reports FOR SELECT USING (auth.uid() = reporter_user_id);
CREATE POLICY "Admins view all reports" ON public.community_reports FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.community_reports FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Counter triggers
CREATE OR REPLACE FUNCTION public.bump_post_reply_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET reply_count = reply_count + 1, updated_at = now() WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_post_reply_count
AFTER INSERT OR DELETE ON public.community_replies
FOR EACH ROW EXECUTE FUNCTION public.bump_post_reply_count();

CREATE OR REPLACE FUNCTION public.bump_reaction_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE delta int;
BEGIN
  IF TG_OP = 'INSERT' THEN delta := 1;
  ELSE delta := -1;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL) OR (TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL) THEN
    UPDATE public.community_posts SET reaction_count = GREATEST(reaction_count + delta, 0)
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  IF (TG_OP = 'INSERT' AND NEW.reply_id IS NOT NULL) OR (TG_OP = 'DELETE' AND OLD.reply_id IS NOT NULL) THEN
    UPDATE public.community_replies SET reaction_count = GREATEST(reaction_count + delta, 0)
    WHERE id = COALESCE(NEW.reply_id, OLD.reply_id);
  END IF;

  IF TG_OP = 'INSERT' THEN RETURN NEW; ELSE RETURN OLD; END IF;
END $$;
CREATE TRIGGER trg_reaction_count
AFTER INSERT OR DELETE ON public.community_reactions
FOR EACH ROW EXECUTE FUNCTION public.bump_reaction_count();

-- Allow anyone to view minimal author info (full_name, avatar via gravatar/seed) for posts
CREATE POLICY "Anyone views basic profile info for community"
ON public.profiles FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.community_posts p WHERE p.user_id = profiles.user_id)
  OR EXISTS (SELECT 1 FROM public.community_replies r WHERE r.user_id = profiles.user_id)
);

-- Storage bucket for community images
INSERT INTO storage.buckets (id, name, public) VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read community images" ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');
CREATE POLICY "Authenticated upload community images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own community images" ON storage.objects FOR DELETE
  USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed default channels
INSERT INTO public.community_channels (slug, name, description, icon, admin_only_posting, position) VALUES
  ('announcements', 'Announcements', 'Official updates from the Remote Workher team', '📣', true, 1),
  ('scholarships', 'Scholarships', 'Funded opportunities & scholarships we vet for you', '🎓', true, 2),
  ('giveaways', 'Giveaways', 'Free tools, courses & perks from us and our partners', '🎁', true, 3),
  ('questions', 'Ask the Community', 'Career, job-search and life questions — get peer advice', '❓', false, 4),
  ('discussions', 'Discussions', 'Open conversations with other women in tech & remote work', '💬', false, 5),
  ('wins', 'Wins & Brags', 'Celebrate offers, promotions, raises and milestones', '🏆', false, 6);