import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "./useUserPlan";
import { toast } from "sonner";

const PLAN_LIMITS: Record<string, number> = {
  basic: 100,
  silver: 1000,
  gold: 2000,
};

export const useEmailCredits = () => {
  const { plan } = useUserPlan();
  const [usedCredits, setUsedCredits] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const totalCredits = PLAN_LIMITS[plan] || 100;
  const remainingCredits = Math.max(0, totalCredits - usedCredits);
  const canRevealEmail = remainingCredits > 0;

  const fetchCredits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("email_reveals")
      .select("executive_id");

    if (!error && data) {
      setUsedCredits(data.length);
      setRevealedIds(new Set(data.map((r) => r.executive_id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const revealEmail = useCallback(async (executiveId: string): Promise<boolean> => {
    if (revealedIds.has(executiveId)) return true;
    if (!canRevealEmail) {
      toast.error("Sin créditos disponibles. Actualiza tu plan para desbloquear más emails.");
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("email_reveals")
      .insert({ user_id: user.id, executive_id: executiveId });

    if (error) {
      if (error.code === "23505") {
        // Already revealed (unique constraint)
        setRevealedIds((prev) => new Set(prev).add(executiveId));
        return true;
      }
      toast.error("Error al desbloquear email");
      return false;
    }

    setRevealedIds((prev) => new Set(prev).add(executiveId));
    setUsedCredits((prev) => prev + 1);
    return true;
  }, [revealedIds, canRevealEmail]);

  const isRevealed = useCallback(
    (executiveId: string) => revealedIds.has(executiveId),
    [revealedIds]
  );

  return {
    plan,
    usedCredits,
    totalCredits,
    remainingCredits,
    canRevealEmail,
    revealEmail,
    isRevealed,
    loading,
  };
};
