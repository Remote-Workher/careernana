-- 1. Preferences
CREATE TABLE public.accountability_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  goal text,
  role text,
  experience_level text,
  availability text,
  checkin_days text[] NOT NULL DEFAULT '{}',
  is_searching boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accountability_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.accountability_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone authenticated can view searching prefs" ON public.accountability_prefs
  FOR SELECT TO authenticated USING (is_searching = true);
CREATE TRIGGER acc_prefs_updated BEFORE UPDATE ON public.accountability_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Requests
CREATE TABLE public.accountability_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);
ALTER TABLE public.accountability_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their requests" ON public.accountability_requests
  FOR SELECT USING (auth.uid() IN (from_user_id, to_user_id));
CREATE POLICY "Users send requests" ON public.accountability_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Recipient updates request" ON public.accountability_requests
  FOR UPDATE USING (auth.uid() IN (from_user_id, to_user_id));
CREATE INDEX idx_acc_req_to ON public.accountability_requests(to_user_id, status);
CREATE INDEX idx_acc_req_from ON public.accountability_requests(from_user_id, status);
CREATE TRIGGER acc_req_updated BEFORE UPDATE ON public.accountability_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Partnerships (always store user_a < user_b for uniqueness)
CREATE TABLE public.accountability_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  jitsi_room text NOT NULL DEFAULT ('rwh-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  weekly_call_day text,
  weekly_call_time text,
  streak integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
ALTER TABLE public.accountability_partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view own partnership" ON public.accountability_partnerships
  FOR SELECT USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Partners update own partnership" ON public.accountability_partnerships
  FOR UPDATE USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "System inserts partnerships" ON public.accountability_partnerships
  FOR INSERT WITH CHECK (auth.uid() IN (user_a, user_b));
CREATE TRIGGER acc_part_updated BEFORE UPDATE ON public.accountability_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to get current partnership for a user
CREATE OR REPLACE FUNCTION public.current_partnership(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.accountability_partnerships
  WHERE status = 'active' AND _uid IN (user_a, user_b)
  ORDER BY created_at DESC LIMIT 1;
$$;

-- 4. Check-ins
CREATE TABLE public.accountability_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT current_date,
  applied boolean NOT NULL DEFAULT false,
  applications_count integer NOT NULL DEFAULT 0,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partnership_id, user_id, checkin_date)
);
ALTER TABLE public.accountability_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view checkins" ON public.accountability_checkins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accountability_partnerships p
            WHERE p.id = partnership_id AND auth.uid() IN (p.user_a, p.user_b))
  );
CREATE POLICY "User inserts own checkin" ON public.accountability_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User updates own checkin" ON public.accountability_checkins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER acc_chk_updated BEFORE UPDATE ON public.accountability_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Chat messages
CREATE TABLE public.accountability_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accountability_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view messages" ON public.accountability_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accountability_partnerships p
            WHERE p.id = partnership_id AND auth.uid() IN (p.user_a, p.user_b))
  );
CREATE POLICY "Partners insert messages" ON public.accountability_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.accountability_partnerships p
            WHERE p.id = partnership_id AND auth.uid() IN (p.user_a, p.user_b))
  );
CREATE INDEX idx_acc_msg_partnership ON public.accountability_messages(partnership_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.accountability_messages;
ALTER TABLE public.accountability_messages REPLICA IDENTITY FULL;

-- 6. Partner challenges (shared, lightweight)
CREATE TABLE public.accountability_partner_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_days integer NOT NULL DEFAULT 7,
  daily_target integer NOT NULL DEFAULT 1,
  start_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'active',
  user_a_progress integer NOT NULL DEFAULT 0,
  user_b_progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accountability_partner_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view challenges" ON public.accountability_partner_challenges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accountability_partnerships p
            WHERE p.id = partnership_id AND auth.uid() IN (p.user_a, p.user_b))
  );
CREATE POLICY "Partners manage challenges" ON public.accountability_partner_challenges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.accountability_partnerships p
            WHERE p.id = partnership_id AND auth.uid() IN (p.user_a, p.user_b))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.accountability_partnerships p
            WHERE p.id = partnership_id AND auth.uid() IN (p.user_a, p.user_b))
  );
CREATE TRIGGER acc_pchal_updated BEFORE UPDATE ON public.accountability_partner_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();