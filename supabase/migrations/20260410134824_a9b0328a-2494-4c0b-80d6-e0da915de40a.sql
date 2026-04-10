
-- Create email_reveals table
CREATE TABLE IF NOT EXISTS public.email_reveals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  executive_id UUID NOT NULL REFERENCES public.executives(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, executive_id)
);

ALTER TABLE public.email_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reveals"
ON public.email_reveals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reveals"
ON public.email_reveals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function: get credit limit by plan (use text to avoid enum commit issue)
CREATE OR REPLACE FUNCTION public.get_email_credit_limit(_plan text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _plan
    WHEN 'basic' THEN 100
    WHEN 'silver' THEN 1000
    WHEN 'gold' THEN 2000
    ELSE 100
  END;
$$;

-- Function: get used credits for a user
CREATE OR REPLACE FUNCTION public.get_used_credits(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.email_reveals
  WHERE user_id = _user_id;
$$;

-- Update existing profiles with old plan values
UPDATE public.profiles SET plan = 'basic' WHERE plan::text IN ('professional', 'enterprise');
