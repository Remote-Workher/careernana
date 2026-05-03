
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS unlock_month text;
