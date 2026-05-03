CREATE TABLE IF NOT EXISTS public.product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('course','resource')),
  product_id uuid NOT NULL,
  product_title text,
  amount_naira integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'paid',
  paystack_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_purchases_user
  ON public.product_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_purchases_product
  ON public.product_purchases(kind, product_id);

ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own product purchases"
  ON public.product_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own product purchases"
  ON public.product_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all product purchases"
  ON public.product_purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));