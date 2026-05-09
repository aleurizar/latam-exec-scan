import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingTaskKey =
  | "search"
  | "filter"
  | "compare"
  | "list"
  | "reveal"
  | "export";

export const ONBOARDING_TASKS: { key: OnboardingTaskKey; label: string }[] = [
  { key: "search", label: "Hacé tu primera búsqueda" },
  { key: "filter", label: "Aplicá un filtro avanzado" },
  { key: "compare", label: "Compará 2 empresas" },
  { key: "list", label: "Creá tu primera lista" },
  { key: "reveal", label: "Revelá el email de un ejecutivo" },
  { key: "export", label: "Exportá resultados" },
];

interface OnboardingRow {
  user_id: string;
  tour_completed: boolean;
  tour_skipped: boolean;
  tasks: Record<string, boolean>;
  widget_dismissed: boolean;
}

export const useOnboarding = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user_onboarding"],
    staleTime: 60_000,
    queryFn: async (): Promise<OnboardingRow | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: row } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (row) return row as OnboardingRow;

      // Lazy create
      const { data: created } = await supabase
        .from("user_onboarding")
        .insert({ user_id: user.id })
        .select("*")
        .single();
      return created as OnboardingRow;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Omit<OnboardingRow, "user_id">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const merged = {
        ...(data ?? {}),
        ...patch,
        tasks: { ...(data?.tasks ?? {}), ...(patch.tasks ?? {}) },
        user_id: user.id,
      };
      await supabase
        .from("user_onboarding")
        .upsert(merged, { onConflict: "user_id" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_onboarding"] }),
  });

  const tasks = data?.tasks ?? {};
  const completedCount = ONBOARDING_TASKS.filter((t) => tasks[t.key]).length;

  const markTask = (key: OnboardingTaskKey) => {
    if (tasks[key]) return;
    update.mutate({ tasks: { [key]: true } });
  };

  return {
    loading: isLoading,
    data,
    tasks,
    completedCount,
    totalTasks: ONBOARDING_TASKS.length,
    tourCompleted: data?.tour_completed ?? false,
    tourSkipped: data?.tour_skipped ?? false,
    widgetDismissed: data?.widget_dismissed ?? false,
    markTask,
    completeTour: () => update.mutate({ tour_completed: true }),
    skipTour: () => update.mutate({ tour_skipped: true }),
    resetTour: () =>
      update.mutate({ tour_completed: false, tour_skipped: false, widget_dismissed: false }),
    dismissWidget: () => update.mutate({ widget_dismissed: true }),
  };
};

/** Helper hook: marks a task on mount (one-shot side effect). */
export const useMarkTaskOnMount = (key: OnboardingTaskKey, when: boolean = true) => {
  const { markTask } = useOnboarding();
  useEffect(() => {
    if (when) markTask(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when]);
};
