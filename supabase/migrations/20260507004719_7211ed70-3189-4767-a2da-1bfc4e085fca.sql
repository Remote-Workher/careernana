-- My Plan: goal-driven 30-day execution system
CREATE TYPE public.plan_goal AS ENUM ('remote_job', 'freelance_clients', 'career_brand');
CREATE TYPE public.plan_status AS ENUM ('active', 'completed', 'abandoned');

CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal public.plan_goal NOT NULL,
  status public.plan_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_days INTEGER NOT NULL DEFAULT 30,
  current_day INTEGER NOT NULL DEFAULT 1,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  generation_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active plan per user
CREATE UNIQUE INDEX user_plans_one_active_per_user
  ON public.user_plans (user_id) WHERE status = 'active';

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plans" ON public.user_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own plans" ON public.user_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plans" ON public.user_plans
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own plans" ON public.user_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  slot INTEGER NOT NULL DEFAULT 0, -- 0 = primary, 1+ = supporting
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_link TEXT,
  estimated_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX plan_tasks_plan_day ON public.plan_tasks (plan_id, day_number, slot);

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plan tasks" ON public.plan_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plan tasks" ON public.plan_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plan tasks" ON public.plan_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own plan tasks" ON public.plan_tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();