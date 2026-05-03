ALTER TABLE public.profiles ALTER COLUMN tokens_remaining SET DEFAULT 0;
UPDATE public.profiles SET tokens_remaining = 0 WHERE plan_tier = 'free' AND tokens_remaining = 25;