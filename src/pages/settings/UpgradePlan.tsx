import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Zap } from "lucide-react";
import { useUserPlan, PlanType } from "@/hooks/useUserPlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UpgradePlanProps {
  onBack: () => void;
}

const plans = [
  {
    id: "basic" as PlanType,
    name: "Basic",
    price: "Gratis",
    credits: 100,
    features: [
      "100 créditos de email",
      "Acceso a base de datos",
      "Exportación básica",
      "Filtros de búsqueda",
    ],
  },
  {
    id: "silver" as PlanType,
    name: "Silver",
    price: "$49/mes",
    credits: 1000,
    popular: true,
    features: [
      "1,000 créditos de email",
      "Acceso completo a datos",
      "Exportación ilimitada",
      "Filtros avanzados",
      "Soporte prioritario",
    ],
  },
  {
    id: "gold" as PlanType,
    name: "Gold",
    price: "$99/mes",
    credits: 2000,
    features: [
      "2,000 créditos de email",
      "Acceso completo a datos",
      "Exportación ilimitada",
      "Filtros avanzados",
      "Soporte premium",
      "API access",
    ],
  },
];

export const UpgradePlan = ({ onBack }: UpgradePlanProps) => {
  const { plan: currentPlan } = useUserPlan();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === currentPlan) return;
    setLoading(planId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sesión no válida"); return; }

      const { data, error } = await supabase.functions.invoke("update-plan", {
        body: { plan: planId },
      });

      if (error) throw error;
      toast.success(`Plan actualizado a ${planId.charAt(0).toUpperCase() + planId.slice(1)}`);
      // Reload to refresh plan state
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar plan");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Elegir Plan</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={cn(
              "relative",
              p.popular && "border-primary shadow-md",
              currentPlan === p.id && "ring-2 ring-primary"
            )}
          >
            {p.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{p.name}</CardTitle>
              <div className="text-2xl font-bold text-foreground">{p.price}</div>
              <p className="text-sm text-muted-foreground">{p.credits.toLocaleString()} créditos</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={currentPlan === p.id ? "outline" : "default"}
                disabled={currentPlan === p.id || loading !== null}
                onClick={() => handleSelectPlan(p.id)}
              >
                {loading === p.id ? "Procesando..." : currentPlan === p.id ? "Plan actual" : "Elegir plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
