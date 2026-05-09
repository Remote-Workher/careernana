DELETE FROM auth.users
WHERE id IN (
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.plan_tier = 'free'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.user_id AND ur.role = 'admin'
    )
);