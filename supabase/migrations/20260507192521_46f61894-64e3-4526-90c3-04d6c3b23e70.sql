
CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  reference text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paystack_webhook_events_reference
  ON public.paystack_webhook_events(reference);

ALTER TABLE public.paystack_webhook_events ENABLE ROW LEVEL SECURITY;

-- No client read/write. Service role bypasses RLS for the edge function.
-- (No policies = denied for authenticated/anon, which is what we want.)
