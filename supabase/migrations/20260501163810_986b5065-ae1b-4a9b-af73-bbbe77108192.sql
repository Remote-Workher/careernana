-- Featured expiry + paid slot marker on jobs
ALTER TABLE public.recruiter_jobs
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_paid_slot boolean NOT NULL DEFAULT false;

-- Payments table
CREATE TABLE IF NOT EXISTS public.recruiter_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.recruiter_jobs(id) ON DELETE SET NULL,
  purpose text NOT NULL CHECK (purpose IN ('extra_job_slot','feature_job','hire_for_me')),
  amount_kobo integer NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','cancelled')),
  paystack_reference text UNIQUE,
  paystack_access_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_recruiter_payments_user ON public.recruiter_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_payments_ref ON public.recruiter_payments(paystack_reference);

ALTER TABLE public.recruiter_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own payments"
  ON public.recruiter_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Recruiters insert own payments"
  ON public.recruiter_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all payments"
  ON public.recruiter_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_recruiter_payments_updated_at
  BEFORE UPDATE ON public.recruiter_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();