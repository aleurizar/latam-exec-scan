import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Rocket, X, PlayCircle } from "lucide-react";
import { useOnboarding, ONBOARDING_TASKS } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  onReplayTour: () => void;
}

export const OnboardingChecklist = ({ onReplayTour }: OnboardingChecklistProps) => {
  const { tasks, completedCount, totalTasks, widgetDismissed, dismissWidget, loading } = useOnboarding();
  const [open, setOpen] = useState(false);

  if (loading || widgetDismissed) return null;

  const allDone = completedCount === totalTasks;
  const pct = (completedCount / totalTasks) * 100;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 p-0 relative"
            aria-label="Guía de uso"
          >
            <Rocket className="w-6 h-6" />
            {!allDone && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-medium">
                {totalTasks - completedCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" side="top" className="w-80 p-0">
          <div className="p-4 border-b">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Guía de uso</h3>
                <p className="text-xs text-muted-foreground">
                  {allDone ? "¡Completaste todo! 🎉" : `Te faltan ${totalTasks - completedCount} pasos`}
                </p>
              </div>
              {allDone && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismissWidget}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Progress value={pct} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{completedCount} de {totalTasks}</p>
          </div>

          <div className="p-2 max-h-72 overflow-y-auto">
            {ONBOARDING_TASKS.map((t) => {
              const done = !!tasks[t.key];
              return (
                <div
                  key={t.key}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded text-sm",
                    done ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span>{t.label}</span>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setOpen(false); onReplayTour(); }}
            >
              <PlayCircle className="w-4 h-4 mr-2" /> Ver tour guiado
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
