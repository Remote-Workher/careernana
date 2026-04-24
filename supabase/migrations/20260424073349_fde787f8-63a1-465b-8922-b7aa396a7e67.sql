CREATE TABLE public.tool_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  tool_route text,
  credits_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_usage_user_created ON public.tool_usage (user_id, created_at DESC);

ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool usage"
  ON public.tool_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool usage"
  ON public.tool_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);