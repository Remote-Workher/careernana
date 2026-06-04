DROP POLICY IF EXISTS "Anyone authenticated can view templates" ON public.email_templates;
REVOKE SELECT ON public.email_templates FROM authenticated, anon;
GRANT ALL ON public.email_templates TO service_role;