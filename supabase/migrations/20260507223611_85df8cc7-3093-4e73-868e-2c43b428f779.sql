CREATE TABLE public.challenge_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  url text,
  resource_type text NOT NULL DEFAULT 'link',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_resources_challenge_id ON public.challenge_resources(challenge_id);

ALTER TABLE public.challenge_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views challenge resources"
ON public.challenge_resources
FOR SELECT
USING (true);

CREATE POLICY "Admins manage challenge resources"
ON public.challenge_resources
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_challenge_resources_updated_at
BEFORE UPDATE ON public.challenge_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();