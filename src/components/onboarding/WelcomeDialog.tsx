import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface WelcomeDialogProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export const WelcomeDialog = ({ open, onStart, onSkip }: WelcomeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>¡Bienvenido a LATAM Business Data!</DialogTitle>
          <DialogDescription>
            Te muestro la plataforma en menos de un minuto. Vas a aprender a buscar empresas,
            filtrar, comparar, crear listas y revelar contactos clave.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onSkip}>Saltar</Button>
          <Button onClick={onStart}>Empezar tour</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
