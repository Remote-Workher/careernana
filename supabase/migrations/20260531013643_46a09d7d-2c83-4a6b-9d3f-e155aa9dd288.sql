CREATE TABLE public.member_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  email text NULL,
  full_name text NULL,
  phone text NOT NULL,
  best_time text NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.member_checkins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_checkins TO authenticated;
GRANT ALL ON public.member_checkins TO service_role;

ALTER TABLE public.member_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a check-in"
ON public.member_checkins
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their own check-ins"
ON public.member_checkins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_member_checkins_created_at ON public.member_checkins(created_at DESC);
CREATE INDEX idx_member_checkins_user_id ON public.member_checkins(user_id);