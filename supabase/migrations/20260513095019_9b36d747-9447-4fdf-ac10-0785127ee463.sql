-- 1. Audience flag on live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.live_sessions.is_public IS
  'When true, this webinar can be RSVPed to by anyone (guests with name+email). When false, only signed-in members can RSVP.';

-- 2. Guest registration support on live_session_registrations
ALTER TABLE public.live_session_registrations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.live_session_registrations
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false;

-- Either user_id (member) OR email (guest) must be present
ALTER TABLE public.live_session_registrations
  DROP CONSTRAINT IF EXISTS lsr_member_or_guest;
ALTER TABLE public.live_session_registrations
  ADD CONSTRAINT lsr_member_or_guest
    CHECK (user_id IS NOT NULL OR (email IS NOT NULL AND length(trim(email)) > 0));

-- Unique guest registration per (session, lower(email))
CREATE UNIQUE INDEX IF NOT EXISTS uq_lsr_session_email
  ON public.live_session_registrations (session_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lsr_email
  ON public.live_session_registrations (lower(email))
  WHERE email IS NOT NULL;

-- 3. RLS — admins can see all registrations for management
DROP POLICY IF EXISTS "Admins view all registrations" ON public.live_session_registrations;
CREATE POLICY "Admins view all registrations"
  ON public.live_session_registrations
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Note: guest INSERTs go through the SECURITY DEFINER edge function using the
-- service role key, so we deliberately do NOT add a public anon INSERT policy
-- here. This keeps RLS as a defense-in-depth layer against direct anon writes.
