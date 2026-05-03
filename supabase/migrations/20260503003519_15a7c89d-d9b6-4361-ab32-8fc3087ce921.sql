-- Per-admin scoping: super admins see everything; scoped admins only see selected sections.
CREATE TABLE IF NOT EXISTS public.admin_scopes (
  user_id uuid PRIMARY KEY,
  is_super boolean NOT NULL DEFAULT false,
  sections text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view scopes"
ON public.admin_scopes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins manage scopes"
ON public.admin_scopes FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.admin_scopes s WHERE s.user_id = auth.uid() AND s.is_super = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_scopes s WHERE s.user_id = auth.uid() AND s.is_super = true)
);

CREATE TRIGGER update_admin_scopes_updated_at
BEFORE UPDATE ON public.admin_scopes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: any existing admin becomes a super admin (so you don't get locked out).
INSERT INTO public.admin_scopes (user_id, is_super, sections)
SELECT user_id, true, '{}'::text[]
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;