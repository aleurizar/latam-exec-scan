
-- Enable trigram extension for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_size ON public.companies(size);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON public.companies USING GIN (name gin_trgm_ops);

-- Executives indexes
CREATE INDEX IF NOT EXISTS idx_executives_company_id ON public.executives(company_id);
CREATE INDEX IF NOT EXISTS idx_executives_country ON public.executives(country);
CREATE INDEX IF NOT EXISTS idx_executives_position ON public.executives(position);
CREATE INDEX IF NOT EXISTS idx_executives_seniority ON public.executives(seniority);
CREATE INDEX IF NOT EXISTS idx_executives_email ON public.executives(email);
CREATE INDEX IF NOT EXISTS idx_executives_full_name_trgm ON public.executives USING GIN (full_name gin_trgm_ops);

-- Per-user tables
CREATE INDEX IF NOT EXISTS idx_email_reveals_user_id ON public.email_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON public.list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_item ON public.list_items(item_type, item_id);

-- Aggregated RPC for admin users panel (avoids N+1)
CREATE OR REPLACE FUNCTION public.get_all_users_with_credits()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  plan text,
  credits_used integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.plan::text,
    COALESCE(r.cnt, 0)::integer AS credits_used
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*)::int AS cnt
    FROM public.email_reveals
    GROUP BY user_id
  ) r ON r.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin'::user_role)
  ORDER BY p.created_at DESC;
$$;
