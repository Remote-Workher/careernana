
CREATE TABLE IF NOT EXISTS public.challenge_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title text NOT NULL,
  action_item text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, day_number)
);

ALTER TABLE public.challenge_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views challenge tasks"
  ON public.challenge_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND (c.is_published = true OR has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Admins manage challenge tasks"
  ON public.challenge_tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_challenge_tasks_updated
BEFORE UPDATE ON public.challenge_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_challenge_tasks_challenge ON public.challenge_tasks(challenge_id, day_number);
