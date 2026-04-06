import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "basic" | "professional" | "enterprise";

export const useUserPlan = () => {
  const [plan, setPlan] = useState<PlanType>("basic");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (data?.plan) setPlan(data.plan as PlanType);
      setLoading(false);
    };
    fetchPlan();
  }, []);

  const canViewContactInfo = plan === "professional" || plan === "enterprise";

  return { plan, loading, canViewContactInfo };
};
