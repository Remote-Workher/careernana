CREATE TABLE public.class_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active categories"
  ON public.class_categories FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage categories"
  ON public.class_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_class_categories_updated_at
  BEFORE UPDATE ON public.class_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.class_categories (name, slug, position) VALUES
  ('Career Growth', 'career-growth', 1),
  ('Leadership', 'leadership', 2),
  ('Technology', 'technology', 3),
  ('Personal Branding', 'personal-branding', 4),
  ('Productivity', 'productivity', 5)
ON CONFLICT (slug) DO NOTHING;