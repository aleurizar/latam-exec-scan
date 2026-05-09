import { useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeDialog } from "./WelcomeDialog";

interface OnboardingTourProps {
  /** Called by Dashboard so the tour can switch the active view between steps. */
  onNavigate?: (view: "home" | "companies" | "executives" | "lists") => void;
  /** External trigger (from checklist "Reanudar tour"). */
  triggerStartAt?: number;
}

const STEPS = (onNavigate?: OnboardingTourProps["onNavigate"]) => [
  {
    element: '[data-tour="sidebar-home"]',
    popover: {
      title: "Dashboard",
      description: "Acá vas a ver el resumen de empresas, ejecutivos y métricas clave.",
    },
    onHighlightStarted: () => onNavigate?.("home"),
  },
  {
    element: '[data-tour="sidebar-companies"]',
    popover: {
      title: "Empresas",
      description: "Accedé a toda la base de empresas LATAM, con filtros y búsqueda.",
    },
    onHighlightStarted: () => onNavigate?.("companies"),
  },
  {
    element: '[data-tour="search-input"]',
    popover: {
      title: "Buscar y filtrar",
      description: "Buscá por nombre y abrí los filtros avanzados (país, industria, tamaño).",
    },
  },
  {
    element: '[data-tour="sidebar-filters"]',
    popover: {
      title: "Filtros avanzados",
      description: "Mostrá u ocultá el panel de filtros desde acá en cualquier momento.",
    },
  },
  {
    element: '[data-tour="sidebar-lists"]',
    popover: {
      title: "Listas",
      description: "Guardá empresas y ejecutivos en listas personalizadas para trabajar después.",
    },
    onHighlightStarted: () => onNavigate?.("lists"),
  },
  {
    element: '[data-tour="sidebar-executives"]',
    popover: {
      title: "Ejecutivos",
      description: "Mirá contactos clave por empresa. Podés revelar emails (consume 1 crédito).",
    },
    onHighlightStarted: () => onNavigate?.("executives"),
  },
  {
    element: '[data-tour="sidebar-export"]',
    popover: {
      title: "Exportar",
      description: "Exportá tus resultados filtrados en CSV o Excel (según tu plan).",
    },
  },
  {
    element: '[data-tour="notifications-bell"]',
    popover: {
      title: "Notificaciones y configuración",
      description: "Acá vas a recibir avisos. En Configuración gestionás tu plan, créditos y equipo.",
    },
  },
];

export const OnboardingTour = ({ onNavigate, triggerStartAt }: OnboardingTourProps) => {
  const { tourCompleted, tourSkipped, completeTour, skipTour, loading } = useOnboarding();
  const [showWelcome, setShowWelcome] = useState(false);
  const driverRef = useRef<Driver | null>(null);

  // Auto-show welcome on first login
  useEffect(() => {
    if (loading) return;
    if (!tourCompleted && !tourSkipped) setShowWelcome(true);
  }, [loading, tourCompleted, tourSkipped]);

  const startTour = (startAt = 0) => {
    setShowWelcome(false);
    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Atrás",
      doneBtnText: "Listo",
      progressText: "{{current}} de {{total}}",
      steps: STEPS(onNavigate),
      onDestroyed: () => {
        completeTour();
      },
    });
    driverRef.current = d;
    d.drive(startAt);
  };

  // External re-trigger (any change to a positive value relaunches)
  useEffect(() => {
    if (triggerStartAt !== undefined && triggerStartAt > 0) {
      startTour(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerStartAt]);

  return (
    <WelcomeDialog
      open={showWelcome}
      onStart={() => startTour(0)}
      onSkip={() => { setShowWelcome(false); skipTour(); }}
    />
  );
};
