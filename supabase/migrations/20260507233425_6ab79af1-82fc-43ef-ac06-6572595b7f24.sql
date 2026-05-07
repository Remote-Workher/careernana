-- Delete two specific user accounts and their data
-- The auth.users delete will cascade to profile rows that reference auth.users via FK on delete cascade
DELETE FROM auth.users WHERE id IN ('f14945cc-73af-4655-8e8c-43acf1f8bc63', 'ed9dc607-26fb-4564-a195-429376332885');
-- Defensive: also remove from public.profiles in case no FK cascade exists
DELETE FROM public.profiles WHERE user_id IN ('f14945cc-73af-4655-8e8c-43acf1f8bc63', 'ed9dc607-26fb-4564-a195-429376332885');