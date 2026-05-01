REVOKE EXECUTE ON FUNCTION public.consume_member_quota(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_member_quota(text) TO authenticated;