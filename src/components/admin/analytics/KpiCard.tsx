import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  previous?: number | null;
  current?: number;
  icon?: React.ElementType;
}

export const KpiCard = ({ label, value, previous, current, icon: Icon }: KpiCardProps) => {
  let delta: number | null = null;
  if (previous !== undefined && previous !== null && current !== undefined) {
    if (previous === 0) delta = current > 0 ? 100 : 0;
    else delta = ((current - previous) / previous) * 100;
  }

  const positive = delta !== null && delta > 0;
  const negative = delta !== null && delta < 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            {delta !== null && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1 text-xs",
                  positive && "text-green-600",
                  negative && "text-destructive",
                  !positive && !negative && "text-muted-foreground"
                )}
              >
                {positive ? <ArrowUp className="w-3 h-3" /> : negative ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                <span>{Math.abs(delta).toFixed(1)}% vs período previo</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
