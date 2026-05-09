# Onboarding guiado dentro de la app

Combina un **tour interactivo** (spotlight sobre elementos reales de la UI) con un **checklist persistente** que mide progreso real. Se dispara automáticamente la primera vez y queda disponible bajo demanda desde un botón flotante de ayuda.

## Experiencia de usuario

1. Primer login → modal de bienvenida ("Te muestro la plataforma en 60 segundos") con botones **Empezar tour** / **Saltar**.
2. **Tour interactivo** (8 pasos) que resalta elementos reales con overlay oscuro + tooltip:
   1. Sidebar → Dashboard (vista resumen)
   2. Sidebar → Empresas (acceso a la base)
   3. Buscador + botón filtros avanzados
   4. Selección múltiple → botón **Comparar** (2-3 empresas)
   5. Botón **Agregar a lista** + sección **Listas** del sidebar
   6. Fila de ejecutivo → botón **Revelar email** (explica que consume 1 crédito)
   7. Botón **Exportar** (CSV)
   8. Campana de **Notificaciones** + acceso a **Configuración / Plan**
3. **Checklist persistente** (botón flotante 🎯 abajo a la derecha, siempre disponible) con tareas que se chequean automáticamente al ejecutarlas:
   - [ ] Hacer tu primera búsqueda
   - [ ] Aplicar un filtro avanzado
   - [ ] Comparar 2 empresas
   - [ ] Crear tu primera lista
   - [ ] Revelar el email de un ejecutivo
   - [ ] Exportar resultados
   
   Barra de progreso (X/6). Al completar todo → toast de felicitaciones + opción de ocultar el widget.
4. Estado guardado por usuario en la base, sincronizado entre dispositivos. Botón **"Ver tour de nuevo"** en Configuración.

## Detalles técnicos

**Librería**: `driver.js` (ligera, ~10KB, sin deps, soporta spotlight + tooltips estilizables con tokens del design system). Alternativa considerada: `react-joyride` (más pesada).

**Base de datos** (1 migración):
- Tabla `user_onboarding`: `user_id` (PK, FK profiles), `tour_completed` bool, `tour_skipped` bool, `tasks` jsonb (mapa `{ search:true, filter:false, ... }`), `widget_dismissed` bool, `updated_at`.
- RLS: cada usuario lee/escribe solo su fila. Trigger `handle_new_user` extendido para crear la fila al alta (o upsert lazy en frontend).

**Frontend**:
- `src/hooks/useOnboarding.ts`: lee/escribe `user_onboarding` con TanStack Query, expone `tasks`, `markTask(key)`, `completeTour()`, `skipTour()`, `resetTour()`.
- `src/components/onboarding/OnboardingTour.tsx`: configura los 8 pasos de driver.js apuntando a selectores `data-tour="..."` en la UI real. Se monta en `Dashboard.tsx` y se auto-arranca si `!tour_completed && !tour_skipped`.
- `src/components/onboarding/OnboardingChecklist.tsx`: botón flotante (FAB) + popover con la lista, progreso y CTA "Reanudar tour".
- `src/components/onboarding/WelcomeDialog.tsx`: modal inicial.
- Atributos `data-tour` agregados (sin cambios de lógica) en: `AppSidebar`, `CompaniesTable` (toolbar comparar/exportar/agregar a lista), `DataFilters` toggle, `ExecutivesTable` (botón revelar), `NotificationsBell`.
- Disparadores de `markTask` integrados en handlers existentes:
  - `search` → al tipear en el buscador del Dashboard
  - `filter` → al aplicar filtro en `DataFilters`
  - `compare` → al abrir `CompareCompaniesView`
  - `list` → al crear lista en `ListsView` / `AddToListDialog`
  - `reveal` → al confirmar reveal en `ExecutivesTable` / `DetailPanel`
  - `export` → al confirmar export en `ExportDialog`
- Entrada en `Settings`: link "Reiniciar tour de onboarding".

**i18n**: textos en español (consistente con el resto). Estructurados como constantes para futura traducción a EN/PT.

**Estilo**: tooltips con tokens semánticos (`bg-card`, `text-foreground`, `border-border`, `shadow-elegant`). Sin colores hardcodeados.

## Fuera de alcance (para una iteración futura)
- Onboarding del flujo admin (Importar datos, Gestionar usuarios).
- Tour del flujo de upgrade de plan / checkout.
- Tutoriales en video embebidos.
