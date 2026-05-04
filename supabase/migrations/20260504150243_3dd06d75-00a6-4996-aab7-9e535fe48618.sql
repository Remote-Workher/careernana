ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS paid_from timestamp with time zone;