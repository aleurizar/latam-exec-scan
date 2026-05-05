import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, CreditCard, Bell, Shield, Users, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanSettings } from "@/pages/settings/PlanSettings";
import { UpgradePlan } from "@/pages/settings/UpgradePlan";
import { CreditUsage } from "@/pages/settings/CreditUsage";
import { AdminUsers } from "@/pages/settings/AdminUsers";
import { CheckoutSimulado } from "@/pages/settings/CheckoutSimulado";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { PlanType } from "@/hooks/useUserPlan";

type SettingsView = "profile" | "plan" | "upgrade" | "checkout" | "credits" | "notifications" | "security" | "admin-users" | "import";

const Settings = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<SettingsView>("plan");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<Exclude<PlanType, "basic"> | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin(roles?.some((r) => r.role === "admin") || false);
    };
    checkAuth();
  }, [navigate]);

  const menuItems: { id: SettingsView; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "plan", label: "Plan y Créditos", icon: CreditCard },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "security", label: "Seguridad", icon: Shield },
    ...(isAdmin ? [
      { id: "import" as SettingsView, label: "Importar datos", icon: Upload },
      { id: "admin-users" as SettingsView, label: "Usuarios", icon: Users },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Button>
        <h1 className="text-lg font-bold text-foreground">Configuración</h1>
      </header>

      <div className="max-w-6xl mx-auto flex gap-6 p-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  activeView === item.id || (activeView === "upgrade" && item.id === "plan") || (activeView === "credits" && item.id === "plan")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeView === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-foreground">{profile?.full_name || "Sin nombre"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground">{profile?.email}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeView === "plan" && (
            <PlanSettings
              onUpgrade={() => setActiveView("upgrade")}
              onViewCredits={() => setActiveView("credits")}
            />
          )}

          {activeView === "upgrade" && (
            <UpgradePlan onBack={() => setActiveView("plan")} />
          )}

          {activeView === "credits" && (
            <CreditUsage onBack={() => setActiveView("plan")} />
          )}

          {activeView === "notifications" && (
            <Card>
              <CardHeader><CardTitle>Notificaciones</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Próximamente.</p>
              </CardContent>
            </Card>
          )}

          {activeView === "security" && (
            <Card>
              <CardHeader><CardTitle>Seguridad</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Próximamente.</p>
              </CardContent>
            </Card>
          )}

          {activeView === "import" && isAdmin && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Importar Datos</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Importa empresas y ejecutivos desde archivos CSV o Excel.</p>
                <Button onClick={() => setShowImport(true)}>Iniciar importación</Button>
              </CardContent>
            </Card>
          )}

          {activeView === "admin-users" && isAdmin && <AdminUsers />}
        </div>
      </div>

      <ImportDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
};

export default Settings;
