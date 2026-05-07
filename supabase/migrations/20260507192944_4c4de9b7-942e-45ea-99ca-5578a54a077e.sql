
ALTER TABLE public.recruiter_payments DROP CONSTRAINT IF EXISTS recruiter_payments_purpose_check;
ALTER TABLE public.recruiter_payments ADD CONSTRAINT recruiter_payments_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'extra_job_slot'::text,
    'feature_job'::text,
    'hire_for_me'::text,
    'boost_job'::text,
    'buy_coins'::text,
    'talent_membership'::text
  ]));
