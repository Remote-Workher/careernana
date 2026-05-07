
ALTER TABLE public.recruiter_payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.recruiter_payments ADD COLUMN IF NOT EXISTS guest_email text;
CREATE INDEX IF NOT EXISTS idx_recruiter_payments_guest_email ON public.recruiter_payments(guest_email) WHERE guest_email IS NOT NULL;
