CREATE POLICY "Admins view paystack webhook events"
  ON public.paystack_webhook_events
  FOR SELECT
  USING (private.has_role(auth.uid(), 'admin'::app_role));