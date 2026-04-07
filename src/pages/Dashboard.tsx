import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { CompaniesTable } from "@/components/dashboard/CompaniesTable";
import { ExecutivesTable } from "@/components/dashboard/ExecutivesTable";
import { DataFilters } from "@/components/dashboard/DataFilters";
import { ExportDialog } from "@/components/dashboard/ExportDialog";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { AppSidebar, SidebarView } from "@/components/dashboard/AppSidebar";
import { DetailPanel } from "@/components/dashboard/DetailPanel";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { ListsView } from "@/components/dashboard/ListsView";

export interface FilterState {
  country: string[];
  industry: string[];
  size: string[];
  search: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("home");
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    industry: [],
    size: [],
    search: "",
  });
  const [detailType, setDetailType] = useState<"company" | "executive" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
  };

  const openDetail = (type: "company" | "executive", id: string) => {
    setDetailType(type);
    setDetailId(id);
  };

  const closeDetail = () => {
    setDetailType(null);
    setDetailId(null);
  };

  const handleDashboardNavigate = (view: "companies" | "executives", filter?: { key: string; value: string }) => {
    if (filter) {
      setFilters({
        country: filter.key === "country" ? [filter.value] : [],
        industry: filter.key === "industry" ? [filter.value] : [],
        size: [],
        search: "",
      });
      setShowFilters(true);
    }
    setActiveView(view);
    closeDetail();
  };

  const debouncedSearch = useDebounce(filters.search, 300);
  const debouncedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters.country, filters.industry, filters.size, debouncedSearch]
  );

  if (!session || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        activeView={activeView}
        onViewChange={(v) => { setActiveView(v); closeDetail(); }}
        onExport={() => setShowExport(true)}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-foreground">LATAM Business Data</h1>
            <p className="text-xs text-muted-foreground">Executive Database Platform</p>
          </div>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeView === "home" && <DashboardHome onNavigate={handleDashboardNavigate} />}

          {activeView === "companies" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Empresas</h2>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresas..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9 pr-9"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters({ ...filters, search: "" })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {showFilters && <DataFilters filters={filters} onFiltersChange={setFilters} />}
              <CompaniesTable filters={debouncedFilters} onSelectCompany={(id) => openDetail("company", id)} />
            </div>
          )}

          {activeView === "executives" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Ejecutivos</h2>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ejecutivos..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9 pr-9"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters({ ...filters, search: "" })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {showFilters && <DataFilters filters={filters} onFiltersChange={setFilters} />}
              <ExecutivesTable filters={debouncedFilters} onSelectExecutive={(id) => openDetail("executive", id)} />
            </div>
          )}

          {activeView === "lists" && (
            <ListsView onSelectItem={(type, id) => openDetail(type, id)} />
          )}
        </div>
      </div>

      <DetailPanel
        type={detailType}
        id={detailId}
        onClose={closeDetail}
        onNavigate={openDetail}
      />

      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        dataType={activeView === "executives" ? "executives" : "companies"}
        filters={filters}
      />
    </div>
  );
};

export default Dashboard;
