
-- Drop the security definer view
DROP VIEW IF EXISTS public.executives_safe;

-- Revert: allow authenticated users to SELECT executives (needed for joins via the view/function)
DROP POLICY IF EXISTS "Only admins can directly select executives" ON public.executives;

-- Re-add a policy that allows all authenticated users to SELECT
CREATE POLICY "Authenticated users can view executives"
ON public.executives
FOR SELECT
TO authenticated
USING (true);
