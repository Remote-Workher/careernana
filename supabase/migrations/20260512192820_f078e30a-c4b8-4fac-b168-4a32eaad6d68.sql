ALTER TABLE public.recruiter_payments
  ADD COLUMN IF NOT EXISTS abandon_email_1h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS abandon_email_24h_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recruiter_payments_abandon_pending
  ON public.recruiter_payments (created_at)
  WHERE status = 'pending' AND paid_at IS NULL AND purpose = 'talent_membership';