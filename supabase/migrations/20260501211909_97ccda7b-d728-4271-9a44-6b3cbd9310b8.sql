ALTER TABLE public.community_replies
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_avatar_url text;