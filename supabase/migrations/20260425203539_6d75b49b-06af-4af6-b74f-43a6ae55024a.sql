CREATE TABLE public.hire_for_me_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_title TEXT NOT NULL,
  role_description TEXT,
  seniority TEXT,
  employment_type TEXT,
  work_type TEXT,
  location TEXT,
  headcount INTEGER NOT NULL DEFAULT 1,
  timeline TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'NGN',
  must_have_skills TEXT[] DEFAULT '{}'::text[],
  nice_to_have_skills TEXT[] DEFAULT '{}'::text[],
  involvement_level TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  additional_notes TEXT,
  pricing_tier TEXT,
  price_amount INTEGER,
  price_currency TEXT DEFAULT 'NGN',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hire_for_me_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view own hire requests"
ON public.hire_for_me_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can insert own hire requests"
ON public.hire_for_me_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can update own hire requests"
ON public.hire_for_me_requests FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_hire_for_me_requests_updated_at
BEFORE UPDATE ON public.hire_for_me_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();