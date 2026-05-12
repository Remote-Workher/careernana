CREATE TABLE IF NOT EXISTS public.support_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an inquiry"
  ON public.support_inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view inquiries"
  ON public.support_inquiries FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update inquiries"
  ON public.support_inquiries FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_support_inquiries_created ON public.support_inquiries(created_at DESC);