-- Add paid_until to profiles to track 30-day access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paid_until timestamp with time zone;

-- Auto-confirm email signups so the single-step checkout flow can sign the user in immediately.
-- (Mock payment flow — real provider verification will replace this later.)