import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "./useUserPlan";
import { toast } from "sonner";

const PLAN_LIMITS: Record<string, number> = {
  basic: 100,
  silver: 1000,
  gold: 2000,
};

interface RevealedContact {
  email: string | null;
  linkedin_url: string | null;
}

export const useEmailCredits = () => {
  const { plan } = useUserPlan();
  const [usedCredits, setUsedCredits] = useState(0);
  const [revealedContacts, setRevealedContacts] = useState<Map<string, RevealedContact>>(new Map());
  const [loading, setLoading] = useState(true);

  const totalCredits = PLAN_LIMITS[plan] || 100;
  const remainingCredits = Math.max(0, totalCredits - usedCredits);
  const canRevealEmail = remainingCredits > 0;

  const fetchCredits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_my_revealed_contacts");

    if (!error && data) {
      const map = new Map<string, RevealedContact>();
      for (const row of data as { executive_id: string; email: string | null; linkedin_url: string | null }[]) {
        map.set(row.executive_id, { email: row.email, linkedin_url: row.linkedin_url });
      }
      setUsedCredits(map.size);
      setRevealedContacts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const revealEmail = useCallback(async (executiveId: string): Promise<boolean> => {
    if (revealedContacts.has(executiveId)) return true;
    if (!canRevealEmail) {
      toast.error("Sin créditos disponibles. Actualiza tu plan para desbloquear más emails.");
      return false;
    }

    const { data, error } = await supabase.rpc("reveal_executive_email", {
      _executive_id: executiveId,
    });

    if (error) {
      if (error.message?.includes("credit_limit_reached")) {
        toast.error("Sin créditos disponibles. Actualiza tu plan para desbloquear más emails.");
      } else {
        toast.error("Error al desbloquear email");
      }
      return false;
    }

    const contact = (data as RevealedContact[] | null)?.[0] ?? { email: null, linkedin_url: null };
    setRevealedContacts((prev) => {
      const next = new Map(prev);
      next.set(executiveId, contact);
      return next;
    });
    setUsedCredits((prev) => prev + 1);
    return true;
  }, [revealedContacts, canRevealEmail]);

  const isRevealed = useCallback(
    (executiveId: string) => revealedContacts.has(executiveId),
    [revealedContacts]
  );

  const getRevealedContact = useCallback(
    (executiveId: string) => revealedContacts.get(executiveId) ?? null,
    [revealedContacts]
  );

  return {
    plan,
    usedCredits,
    totalCredits,
    remainingCredits,
    canRevealEmail,
    revealEmail,
    isRevealed,
    getRevealedContact,
    loading,
  };
};
