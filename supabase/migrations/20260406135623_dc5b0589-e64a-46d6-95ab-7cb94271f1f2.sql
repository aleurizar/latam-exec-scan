
-- Recreate view without security_invoker so it can bypass base table RLS
-- The view itself handles column-level access control via CASE statements
DROP VIEW IF EXISTS public.executives_safe;

CREATE VIEW public.executives_safe
WITH (security_invoker = off) AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.executives_safe TO authenticated;
GRANT SELECT ON public.executives_safe TO anon;
