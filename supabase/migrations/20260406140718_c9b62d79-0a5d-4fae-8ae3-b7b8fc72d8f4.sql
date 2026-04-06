
-- Fix: Prevent users from changing their own plan via profile update
-- Drop the broad update policy
DROP POLICY "Users can update own profile" ON public.profiles;

-- Re-create with WITH CHECK that ensures plan cannot be changed
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid()));
