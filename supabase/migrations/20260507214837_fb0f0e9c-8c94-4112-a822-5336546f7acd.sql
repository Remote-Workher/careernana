REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) TO authenticated, service_role;