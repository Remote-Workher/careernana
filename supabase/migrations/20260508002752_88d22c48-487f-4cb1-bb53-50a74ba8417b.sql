-- Add coming soon flag to courses table
ALTER TABLE public.courses ADD COLUMN is_coming_soon BOOLEAN NOT NULL DEFAULT false;

-- Update existing courses: if not published and no lessons, mark as coming soon
-- (optional sensible default — can be removed if not desired)
UPDATE public.courses SET is_coming_soon = true WHERE is_published = false;

COMMENT ON COLUMN public.courses.is_coming_soon IS 'Shows Coming Soon badge to users; still visible in catalog';

-- Add index for fast filtering
CREATE INDEX idx_courses_coming_soon ON public.courses(is_coming_soon);