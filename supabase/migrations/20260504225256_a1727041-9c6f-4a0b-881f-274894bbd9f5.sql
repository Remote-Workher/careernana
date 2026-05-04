
-- 1. New free signups get 5 coins by default
ALTER TABLE public.profiles ALTER COLUMN tokens_remaining SET DEFAULT 5;

-- 2. Update handle_new_user to grant 5 coins on talent signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', 'talent') = 'recruiter' THEN
    INSERT INTO public.recruiter_profiles (user_id, email, contact_name, company_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'contact_name', NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company_name', '')
    );
  ELSE
    INSERT INTO public.profiles (user_id, email, full_name, tokens_remaining)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 5);
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Backfill: top up existing free users with 0 coins to 5
UPDATE public.profiles
SET tokens_remaining = 5, updated_at = now()
WHERE (plan_tier = 'free' OR plan_tier IS NULL)
  AND COALESCE(tokens_remaining, 0) = 0;
