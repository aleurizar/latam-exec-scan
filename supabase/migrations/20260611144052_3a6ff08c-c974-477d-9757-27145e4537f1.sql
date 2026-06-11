-- 1. Restrict direct access to sensitive executive contact columns
REVOKE SELECT (email, linkedin_url) ON public.executives FROM anon, authenticated;

-- 2. Secure view: real contact only when the current user has revealed it
CREATE OR REPLACE VIEW public.executives_secure
WITH (security_invoker = false) AS
SELECT
  e.id, e.full_name, e.position, e.seniority, e.country,
  e.company_id, e.technologies, e.created_at, e.updated_at,
  CASE WHEN r.user_id IS NOT NULL THEN e.email ELSE NULL END AS email,
  CASE WHEN r.user_id IS NOT NULL THEN e.linkedin_url ELSE NULL END AS linkedin_url,
  CASE WHEN e.email IS NULL THEN NULL
       ELSE left(split_part(e.email, '@', 1), 1) || '***@' || split_part(e.email, '@', 2)
  END AS email_masked,
  (e.email IS NOT NULL) AS has_email,
  (e.linkedin_url IS NOT NULL) AS has_linkedin
FROM public.executives e
LEFT JOIN public.email_reveals r
  ON r.executive_id = e.id AND r.user_id = auth.uid();

GRANT SELECT ON public.executives_secure TO authenticated;

-- 3. Server-side reveal: enforces plan credit limits before exposing contact
CREATE OR REPLACE FUNCTION public.reveal_executive_email(_executive_id uuid)
RETURNS TABLE(email text, linkedin_url text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text;
  _limit int;
  _used int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM email_reveals WHERE user_id = _uid AND executive_id = _executive_id) THEN
    RETURN QUERY SELECT e.email, e.linkedin_url FROM executives e WHERE e.id = _executive_id;
    RETURN;
  END IF;

  SELECT plan::text INTO _plan FROM profiles WHERE id = _uid;
  _limit := get_email_credit_limit(COALESCE(_plan, 'basic'));
  SELECT COUNT(*) INTO _used FROM email_reveals WHERE user_id = _uid;
  IF _used >= _limit THEN RAISE EXCEPTION 'credit_limit_reached'; END IF;

  INSERT INTO email_reveals (user_id, executive_id)
  VALUES (_uid, _executive_id)
  ON CONFLICT (user_id, executive_id) DO NOTHING;

  RETURN QUERY SELECT e.email, e.linkedin_url FROM executives e WHERE e.id = _executive_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reveal_executive_email(uuid) TO authenticated;

-- 4. Fetch contacts the current user has already revealed
CREATE OR REPLACE FUNCTION public.get_my_revealed_contacts()
RETURNS TABLE(executive_id uuid, email text, linkedin_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.executive_id, e.email, e.linkedin_url
  FROM email_reveals r
  JOIN executives e ON e.id = r.executive_id
  WHERE r.user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_revealed_contacts() TO authenticated;

-- 5. Stop cross-user credit-count enumeration
CREATE OR REPLACE FUNCTION public.get_used_credits(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role)
    THEN COALESCE((SELECT COUNT(*)::int FROM email_reveals WHERE user_id = _user_id), 0)
    ELSE NULL
  END;
$$;

-- 6. Prevent self plan escalation: plan column is no longer user-updatable
REVOKE UPDATE (plan) ON public.profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);