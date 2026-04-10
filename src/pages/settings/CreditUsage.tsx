import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mail } from "lucide-react";
import { useEmailCredits } from "@/hooks/useEmailCredits";

interface CreditUsageProps {
  onBack: () => void;
}

interface RevealLog {
  id: string;
  created_at: string;
  executive_name: string;
}

export const CreditUsage = ({ onBack }: CreditUsageProps) => {
  const { usedCredits, totalCredits, remainingCredits, plan } = useEmailCredits();
  const [logs, setLogs] = useState<RevealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const usagePercent = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("email_reveals")
        .select("id, created_at, executive_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        const execIds = data.map((d) => d.executive_id);
        const { data: execs } = await supabase
          .from("executives")
          .select("id, full_name")
          .in("id", execIds);

        const execMap = new Map(execs?.map((e) => [e.id, e.full_name]) || []);
        setLogs(
          data.map((d) => ({
            id: d.id,
            created_at: d.created_at,
            executive_name: execMap.get(d.executive_id) || "Ejecutivo desconocido",
          }))
        );
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Uso de Créditos</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-foreground">{remainingCredits}</div>
            <p className="text-sm text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-foreground">{usedCredits}</div>
            <p className="text-sm text-muted-foreground">Consumidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-foreground">{totalCredits}</div>
            <p className="text-sm text-muted-foreground">Total ({plan})</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progreso</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={usagePercent} className="h-4 mb-2" />
          <p className="text-sm text-muted-foreground">{usagePercent.toFixed(1)}% utilizado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos desbloqueos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">No hay desbloqueos aún.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{log.executive_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
