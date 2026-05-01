-- Talent payment history: every successful Remote Workher membership purchase
CREATE TABLE public.talent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_naira INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  plan_tier public.plan_tier NOT NULL,
  period TEXT NOT NULL,            -- 'monthly' | 'quarterly' | 'yearly'
  period_days INTEGER NOT NULL,
  paid_until TIMESTAMPTZ NOT NULL, -- new paid_until after this purchase
  status TEXT NOT NULL DEFAULT 'paid',
  paystack_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_payments_user ON public.talent_payments(user_id, created_at DESC);

ALTER TABLE public.talent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
ON public.talent_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payments"
ON public.talent_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all talent payments"
ON public.talent_payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));