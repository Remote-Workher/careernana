CREATE TABLE public.live_session_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

CREATE INDEX idx_lsr_user ON public.live_session_registrations(user_id);
CREATE INDEX idx_lsr_session ON public.live_session_registrations(session_id);

ALTER TABLE public.live_session_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own registrations"
  ON public.live_session_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own registrations"
  ON public.live_session_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own registrations"
  ON public.live_session_registrations FOR DELETE
  USING (auth.uid() = user_id);