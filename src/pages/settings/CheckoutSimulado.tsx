import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PlanType } from "@/hooks/useUserPlan";

interface CheckoutSimuladoProps {
  plan: Exclude<PlanType, "basic">;
  onBack: () => void;
  onSuccess: () => void;
}

const planDetails = {
  silver: {
    name: "Silver",
    price: 49,
    credits: 1000,
    features: [
      "1,000 créditos de email por mes",
      "Acceso completo a la base de datos",
      "Exportación ilimitada",
      "Filtros avanzados",
      "Soporte prioritario",
    ],
  },
  gold: {
    name: "Gold",
    price: 99,
    credits: 2000,
    features: [
      "2,000 créditos de email por mes",
      "Acceso completo a la base de datos",
      "Exportación ilimitada",
      "Filtros avanzados",
      "Soporte premium",
      "Acceso a la API",
    ],
  },
};

export const CheckoutSimulado = ({ plan, onBack, onSuccess }: CheckoutSimuladoProps) => {
  const details = planDetails[plan];
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    country: "Argentina",
    zip: "",
  });

  // Pre-cargar email
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setForm((f) => ({ ...f, email: data.user!.email! }));
    });
  });

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const isValid =
    form.cardName.trim().length > 2 &&
    form.cardNumber.replace(/\s/g, "").length === 16 &&
    form.expiry.length === 5 &&
    form.cvc.length >= 3 &&
    form.zip.trim().length > 0;

  const handlePay = async () => {
    if (!isValid) {
      toast.error("Completá todos los campos");
      return;
    }
    setLoading(true);
    try {
      // Simular latencia de procesamiento
      await new Promise((r) => setTimeout(r, 1500));

      const { error } = await supabase.functions.invoke("update-plan", {
        body: { plan },
      });
      if (error) throw error;

      // Intentar enviar email de confirmación (no bloqueante si falla)
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "subscription-confirmation",
            recipientEmail: form.email,
            idempotencyKey: `subscription-${plan}-${Date.now()}`,
            templateData: {
              planName: details.name,
              credits: details.credits,
              price: details.price,
            },
          },
        });
      } catch {
        // Email no configurado todavía, continuar
      }

      toast.success(`¡Bienvenido al plan ${details.name}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
          Modo demo · No se cobrará
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6 bg-muted/30 rounded-xl p-6 border">
        {/* Resumen */}
        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Suscribirse a Plan {details.name}</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-bold text-foreground">${details.price}</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Plan {details.name}</span>
              <span className="text-foreground">${details.price}.00</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Facturado mensualmente</span>
            </div>
          </div>

          <ul className="space-y-2 pt-4 border-t">
            {details.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between pt-4 border-t font-semibold">
            <span>Total hoy</span>
            <span>${details.price}.00 USD</span>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-background rounded-lg p-6 border space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Datos de pago
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cardName">Nombre en la tarjeta</Label>
            <Input
              id="cardName"
              placeholder="Juan Pérez"
              value={form.cardName}
              onChange={(e) => setForm({ ...form, cardName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cardNumber">Número de tarjeta</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={form.cardNumber}
                onChange={(e) => setForm({ ...form, cardNumber: formatCardNumber(e.target.value) })}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 text-[10px] font-bold text-muted-foreground">
                <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded">VISA</span>
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded">MC</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Vencimiento</Label>
              <Input
                id="expiry"
                placeholder="MM/AA"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cvc">CVC</Label>
              <Input
                id="cvc"
                placeholder="123"
                maxLength={4}
                value={form.cvc}
                onChange={(e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">Código postal</Label>
              <Input
                id="zip"
                placeholder="1000"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
          </div>

          <Button
            className="w-full mt-2"
            size="lg"
            disabled={loading || !isValid}
            onClick={handlePay}
          >
            {loading ? (
              "Procesando..."
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pagar ${details.price}.00 / mes
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Modo demo: ningún cobro real será procesado
          </p>
        </div>
      </div>
    </div>
  );
};
