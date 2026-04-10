import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useEmailCredits } from "@/hooks/useEmailCredits";
import { Progress } from "@/components/ui/progress";

const planLabels: Record<string, string> = {
  basic: "Basic (Free)",
  silver: "Silver",
  gold: "Gold",
};

const planColors: Record<string, string> = {
  basic: "secondary",
  silver: "default",
  gold: "default",
};

interface PlanSettingsProps {
  onUpgrade: () => void;
  onViewCredits: () => void;
}

export const PlanSettings = ({ onUpgrade, onViewCredits }: PlanSettingsProps) => {
  const { plan } = useUserPlan();
  const { usedCredits, totalCredits, remainingCredits } = useEmailCredits();
  const usagePercent = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Tu Plan Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={plan === "gold" ? "default" : "secondary"} className="text-base px-4 py-1">
              {planLabels[plan] || plan}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {plan === "basic" && "Plan gratuito con 100 créditos de email."}
            {plan === "silver" && "Plan Silver con 1,000 créditos de email."}
            {plan === "gold" && "Plan Gold con 2,000 créditos de email."}
          </p>
          <Button onClick={onUpgrade}>
            <Zap className="w-4 h-4 mr-2" />
            {plan === "gold" ? "Ver planes" : "Upgrade Plan"}
          </Button>
        </CardContent>
      </Card>

      {/* Credit Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Uso de Créditos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Créditos usados</span>
            <span className="font-medium">{usedCredits} / {totalCredits}</span>
          </div>
          <Progress value={usagePercent} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Disponibles: {remainingCredits}</span>
            <Button variant="link" className="p-0 h-auto" onClick={onViewCredits}>
              Ver detalle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
