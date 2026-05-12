
CREATE TABLE public.onboarding_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_name)
);

CREATE INDEX idx_onboarding_email_sends_user ON public.onboarding_email_sends(user_id);

ALTER TABLE public.onboarding_email_sends ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (used by edge function) can access.
