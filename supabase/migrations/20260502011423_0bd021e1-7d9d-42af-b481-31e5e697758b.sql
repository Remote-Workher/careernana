ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS applied_via text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS description text;

CREATE UNIQUE INDEX IF NOT EXISTS applications_user_source_url_uniq
  ON public.applications (user_id, source_url)
  WHERE source_url IS NOT NULL;