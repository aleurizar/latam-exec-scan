
-- analytics_events
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_events_type_created ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_events_user_created ON public.analytics_events(user_id, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
ON public.analytics_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
ON public.analytics_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- plan_changes
CREATE TABLE public.plan_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_plan text,
  to_plan text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_plan_changes_created ON public.plan_changes(created_at DESC);
CREATE INDEX idx_plan_changes_user ON public.plan_changes(user_id);

ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view plan changes"
ON public.plan_changes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Helpful indexes for analytics aggregations
CREATE INDEX IF NOT EXISTS idx_email_reveals_created ON public.email_reveals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_created ON public.export_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lists_created ON public.lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON public.profiles(created_at DESC);

-- RPC: summary
CREATE OR REPLACE FUNCTION public.admin_analytics_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'reveals', (SELECT COUNT(*) FROM email_reveals WHERE created_at >= _from AND created_at < _to),
    'exports', (SELECT COUNT(*) FROM export_logs WHERE created_at >= _from AND created_at < _to),
    'records_exported', (SELECT COALESCE(SUM(record_count),0) FROM export_logs WHERE created_at >= _from AND created_at < _to),
    'lists_created', (SELECT COUNT(*) FROM lists WHERE created_at >= _from AND created_at < _to),
    'signups', (SELECT COUNT(*) FROM profiles WHERE created_at >= _from AND created_at < _to),
    'upgrades', (SELECT COUNT(*) FROM plan_changes WHERE created_at >= _from AND created_at < _to),
    'logins', (SELECT COUNT(*) FROM analytics_events WHERE event_type='login' AND created_at >= _from AND created_at < _to),
    'searches', (SELECT COUNT(*) FROM analytics_events WHERE event_type='search' AND created_at >= _from AND created_at < _to),
    'dau', (
      SELECT COUNT(DISTINCT uid) FROM (
        SELECT user_id uid FROM email_reveals WHERE created_at >= GREATEST(_from, _to - interval '1 day') AND created_at < _to
        UNION ALL SELECT user_id FROM export_logs WHERE created_at >= GREATEST(_from, _to - interval '1 day') AND created_at < _to
        UNION ALL SELECT user_id FROM analytics_events WHERE created_at >= GREATEST(_from, _to - interval '1 day') AND created_at < _to
      ) s WHERE uid IS NOT NULL
    ),
    'wau', (
      SELECT COUNT(DISTINCT uid) FROM (
        SELECT user_id uid FROM email_reveals WHERE created_at >= GREATEST(_from, _to - interval '7 days') AND created_at < _to
        UNION ALL SELECT user_id FROM export_logs WHERE created_at >= GREATEST(_from, _to - interval '7 days') AND created_at < _to
        UNION ALL SELECT user_id FROM analytics_events WHERE created_at >= GREATEST(_from, _to - interval '7 days') AND created_at < _to
      ) s WHERE uid IS NOT NULL
    ),
    'mau', (
      SELECT COUNT(DISTINCT uid) FROM (
        SELECT user_id uid FROM email_reveals WHERE created_at >= GREATEST(_from, _to - interval '30 days') AND created_at < _to
        UNION ALL SELECT user_id FROM export_logs WHERE created_at >= GREATEST(_from, _to - interval '30 days') AND created_at < _to
        UNION ALL SELECT user_id FROM analytics_events WHERE created_at >= GREATEST(_from, _to - interval '30 days') AND created_at < _to
      ) s WHERE uid IS NOT NULL
    ),
    'plan_distribution', (
      SELECT COALESCE(jsonb_object_agg(plan, cnt), '{}'::jsonb)
      FROM (SELECT plan::text plan, COUNT(*) cnt FROM profiles GROUP BY plan) p
    ),
    'reveals_by_plan', (
      SELECT COALESCE(jsonb_object_agg(plan, cnt), '{}'::jsonb)
      FROM (
        SELECT p.plan::text plan, COUNT(*) cnt
        FROM email_reveals r JOIN profiles p ON p.id = r.user_id
        WHERE r.created_at >= _from AND r.created_at < _to
        GROUP BY p.plan
      ) x
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: timeseries (daily)
CREATE OR REPLACE FUNCTION public.admin_analytics_timeseries(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, reveals int, exports int, signups int, logins int, searches int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(date_trunc('day', _from), date_trunc('day', _to - interval '1 day'), interval '1 day')::date d
  )
  SELECT
    d.d,
    (SELECT COUNT(*)::int FROM email_reveals WHERE created_at::date = d.d),
    (SELECT COUNT(*)::int FROM export_logs WHERE created_at::date = d.d),
    (SELECT COUNT(*)::int FROM profiles WHERE created_at::date = d.d),
    (SELECT COUNT(*)::int FROM analytics_events WHERE event_type='login' AND created_at::date = d.d),
    (SELECT COUNT(*)::int FROM analytics_events WHERE event_type='search' AND created_at::date = d.d)
  FROM days d
  WHERE public.has_role(auth.uid(), 'admin'::user_role)
  ORDER BY d.d;
$$;

-- RPC: top users
CREATE OR REPLACE FUNCTION public.admin_analytics_top_users(_from timestamptz, _to timestamptz, _limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, email text, full_name text, plan text, reveals int, exports int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.plan::text,
    COALESCE((SELECT COUNT(*)::int FROM email_reveals r WHERE r.user_id = p.id AND r.created_at >= _from AND r.created_at < _to), 0),
    COALESCE((SELECT COUNT(*)::int FROM export_logs e WHERE e.user_id = p.id AND e.created_at >= _from AND e.created_at < _to), 0)
  FROM profiles p
  WHERE public.has_role(auth.uid(), 'admin'::user_role)
  ORDER BY (
    COALESCE((SELECT COUNT(*) FROM email_reveals r WHERE r.user_id = p.id AND r.created_at >= _from AND r.created_at < _to), 0)
    + COALESCE((SELECT COUNT(*) FROM export_logs e WHERE e.user_id = p.id AND e.created_at >= _from AND e.created_at < _to), 0)
  ) DESC
  LIMIT _limit;
$$;
