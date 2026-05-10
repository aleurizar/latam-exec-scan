import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface AnalyticsSummary {
  reveals: number;
  exports: number;
  records_exported: number;
  lists_created: number;
  signups: number;
  upgrades: number;
  logins: number;
  searches: number;
  dau: number;
  wau: number;
  mau: number;
  plan_distribution: Record<string, number>;
  reveals_by_plan: Record<string, number>;
}

export interface TimeseriesRow {
  day: string;
  reveals: number;
  exports: number;
  signups: number;
  logins: number;
  searches: number;
}

export interface TopUserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  plan: string;
  reveals: number;
  exports: number;
}

export const getPreviousRange = (range: DateRange): DateRange => {
  const ms = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - ms), to: new Date(range.from.getTime()) };
};

export const useAnalyticsSummary = (range: DateRange, compare: boolean) => {
  return useQuery({
    queryKey: ["analytics-summary", range.from.toISOString(), range.to.toISOString(), compare],
    queryFn: async () => {
      const current = await supabase.rpc("admin_analytics_summary", {
        _from: range.from.toISOString(),
        _to: range.to.toISOString(),
      });
      if (current.error) throw current.error;

      let prev: AnalyticsSummary | null = null;
      if (compare) {
        const p = getPreviousRange(range);
        const r = await supabase.rpc("admin_analytics_summary", {
          _from: p.from.toISOString(),
          _to: p.to.toISOString(),
        });
        if (!r.error) prev = r.data as unknown as AnalyticsSummary;
      }
      return {
        current: current.data as unknown as AnalyticsSummary,
        previous: prev,
      };
    },
    staleTime: 60_000,
  });
};

export const useAnalyticsTimeseries = (range: DateRange) => {
  return useQuery({
    queryKey: ["analytics-timeseries", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics_timeseries", {
        _from: range.from.toISOString(),
        _to: range.to.toISOString(),
      });
      if (error) throw error;
      return (data ?? []) as TimeseriesRow[];
    },
    staleTime: 60_000,
  });
};

export const useAnalyticsTopUsers = (range: DateRange, limit = 10) => {
  return useQuery({
    queryKey: ["analytics-top-users", range.from.toISOString(), range.to.toISOString(), limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics_top_users", {
        _from: range.from.toISOString(),
        _to: range.to.toISOString(),
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as TopUserRow[];
    },
    staleTime: 60_000,
  });
};

export const logAnalyticsEvent = async (
  event_type: string,
  payload: Record<string, unknown> = {}
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("analytics_events").insert([{
    user_id: user.id,
    event_type,
    payload: payload as never,
  }]);
};
