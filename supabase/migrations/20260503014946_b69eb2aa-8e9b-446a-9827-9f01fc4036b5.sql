
CREATE TABLE public.community_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_multiple boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views polls" ON public.community_polls FOR SELECT USING (true);
CREATE POLICY "Authors create polls" ON public.community_polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors delete own polls" ON public.community_polls FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.community_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id, option_index)
);

ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views poll votes" ON public.community_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users cast own votes" ON public.community_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own votes" ON public.community_poll_votes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_poll_votes_poll ON public.community_poll_votes(poll_id);
CREATE INDEX idx_polls_post ON public.community_polls(post_id);
