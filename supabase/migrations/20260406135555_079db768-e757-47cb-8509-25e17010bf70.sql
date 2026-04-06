
-- Create helper function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan::text FROM public.profiles WHERE id = _user_id
$$;

-- Create secure view that masks sensitive fields for basic plan users
CREATE VIEW public.executives_safe
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  position,
  seniority,
  country,
  company_id,
  technologies,
  created_at,
  updated_at,
  CASE
    WHEN public.get_user_plan(auth.uid()) IN ('professional', 'enterprise') THEN email
    ELSE NULL
  END AS email,
  CASE
    WHEN public.get_user_plan(auth.uid()) IN ('professional', 'enterprise') THEN linkedin_url
    ELSE NULL
  END AS linkedin_url
FROM public.executives;

-- Drop the permissive SELECT policy for all authenticated users on base table
DROP POLICY "Authenticated users can view executives" ON public.executives;

-- Add restricted SELECT policy: only via admin role or through the view
CREATE POLICY "Only admins can directly select executives"
ON public.executives
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
