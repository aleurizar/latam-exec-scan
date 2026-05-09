import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Download,
  Filter,
  LogOut,
  Database,
  List,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarView = "home" | "companies" | "executives" | "lists";

interface AppSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onExport: () => void;
  onToggleFilters: () => void;
  onSignOut: () => void;
}

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  action: () => void;
  active?: boolean;
  submenu?: { label: string; action: () => void }[];
  dataTour?: string;
}

export const AppSidebar = ({
  activeView,
  onViewChange,
  onExport,
  onToggleFilters,
  onSignOut,
}: AppSidebarProps) => {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const items: SidebarItem[] = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      action: () => onViewChange("home"),
      active: activeView === "home",
      dataTour: "sidebar-home",
    },
    {
      icon: Building2,
      label: "Empresas",
      action: () => onViewChange("companies"),
      active: activeView === "companies",
      dataTour: "sidebar-companies",
      submenu: [
        { label: "Ver Empresas", action: () => onViewChange("companies") },
        { label: "Exportar", action: onExport },
      ],
    },
    {
      icon: Users,
      label: "Ejecutivos",
      action: () => onViewChange("executives"),
      active: activeView === "executives",
      dataTour: "sidebar-executives",
      submenu: [
        { label: "Ver Ejecutivos", action: () => onViewChange("executives") },
        { label: "Exportar", action: onExport },
      ],
    },
    {
      icon: List,
      label: "Listas",
      action: () => onViewChange("lists"),
      active: activeView === "lists",
      dataTour: "sidebar-lists",
      submenu: [
        { label: "Ver Listas", action: () => onViewChange("lists") },
        { label: "Empresas", action: () => onViewChange("companies") },
        { label: "Ejecutivos", action: () => onViewChange("executives") },
      ],
    },
    {
      icon: Filter,
      label: "Filtros",
      action: onToggleFilters,
      dataTour: "sidebar-filters",
    },
    {
      icon: Download,
      label: "Exportar",
      action: onExport,
      dataTour: "sidebar-export",
    },
    {
      icon: Settings,
      label: "Settings",
      action: () => navigate("/settings"),
      dataTour: "sidebar-settings",
    },
  ];

  return (
    <div className="h-screen w-16 bg-foreground flex flex-col items-center py-4 gap-1 shrink-0 z-50">
      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-6">
        <Database className="w-5 h-5 text-primary-foreground" />
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full">
        {items.map((item, index) => (
          <div
            key={index}
            className="relative"
            onMouseEnter={() => setHoveredItem(index)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button
              onClick={item.action}
              data-tour={item.dataTour}
              className={cn(
                "w-full flex items-center justify-center py-3 transition-colors",
                item.active
                  ? "text-primary bg-primary/10 border-l-2 border-primary"
                  : "text-muted-foreground hover:text-primary-foreground hover:bg-primary/5"
              )}
            >
              <item.icon className="w-5 h-5" />
            </button>

            {hoveredItem === index && (
              <div className="absolute left-full top-0 ml-1 z-50">
                <div className="bg-card border border-border rounded-lg shadow-lg py-2 min-w-[160px]">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.label}
                  </div>
                  {item.submenu ? (
                    item.submenu.map((sub, subIdx) => (
                      <button
                        key={subIdx}
                        onClick={sub.action}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        {sub.label}
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={item.action}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="relative w-full"
        onMouseEnter={() => setHoveredItem(99)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center py-3 text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
        {hoveredItem === 99 && (
          <div className="absolute left-full bottom-0 ml-1 z-50">
            <div className="bg-card border border-border rounded-lg shadow-lg py-2 px-3 min-w-[120px]">
              <span className="text-sm text-foreground">Cerrar sesión</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
