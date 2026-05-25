-- Remove over-permissive profiles policy that exposed full rows (email, phone, resume_url, etc.)
-- to anyone for any user who had ever posted in the community.
-- Community posts/replies already store denormalized author_name and author_avatar_url,
-- so no code path relies on this policy.
DROP POLICY IF EXISTS "Anyone views basic profile info for community" ON public.profiles;