
-- Add pinned + title columns to brag_entries
ALTER TABLE public.brag_entries
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text;

-- Relax category constraint to allow more values used by the new UI
ALTER TABLE public.brag_entries DROP CONSTRAINT IF EXISTS brag_entries_category_check;
ALTER TABLE public.brag_entries
  ADD CONSTRAINT brag_entries_category_check
  CHECK (category = ANY (ARRAY[
    'career','learning','work','impact','growth','health','other',
    'leadership','problem','collaboration','recognition'
  ]));

CREATE INDEX IF NOT EXISTS idx_brag_entries_user_pinned ON public.brag_entries(user_id, pinned);
