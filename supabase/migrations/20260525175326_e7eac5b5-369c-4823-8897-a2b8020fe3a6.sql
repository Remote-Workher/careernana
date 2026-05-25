CREATE TABLE IF NOT EXISTS public.weekly_jobs_digest_sends (
  recipient_email text NOT NULL,
  week_stamp text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipient_email, week_stamp)
);
ALTER TABLE public.weekly_jobs_digest_sends ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) reads/writes this table.