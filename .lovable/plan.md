# Plan: Admin Analytics

Panel dedicado en `/admin/analytics`, accesible solo a admins, con KPIs + gráficos + tabla detallada, filtros por rango custom y comparación contra el período previo.

## 1. Acceso y navegación

- Nueva ruta `/admin/analytics` registrada en `App.tsx`, protegida: redirige si `has_role(uid,'admin')` es false.
- Link "Analytics" en `AppSidebar.tsx` visible solo para admins (junto a Settings).
- Layout propio: header con título, selector de rango y botón "Exportar CSV".

## 2. Controles de tiempo

- Rangos rápidos: 7d / 30d / 90d / Todo.
- Date range picker custom (shadcn Calendar `mode="range"` en Popover, con `pointer-events-auto`).
- Toggle "Comparar con período anterior" → calcula delta % vs ventana de igual duración inmediatamente previa, mostrado en cada KPI con flecha ↑/↓ verde/rojo.

## 3. Métricas (todas las áreas)

**Uso de plataforma**
- DAU / WAU / MAU (usuarios únicos con actividad: login, búsqueda, reveal, export).
- Logins totales, sesiones, retención semanal (cohort simple W1/W2/W4).

**Consumo de créditos / revelados**
- Emails revelados totales en período.
- Distribución por plan (basic/silver/gold).
- Top 10 usuarios por revelados.
- Créditos restantes agregados por plan.

**Búsquedas y filtros**
- Búsquedas totales, filtros más usados, países/industrias top.
- (Requiere log de búsquedas — ver §5.)

**Negocio y planes**
- Distribución de usuarios por plan (donut).
- Upgrades en período (transiciones de plan).
- Exportaciones totales y registros exportados.
- Listas creadas y items agregados.

## 4. Layout (KPIs + gráficos + tabla)

```text
┌─ Header: título · rango · comparar · export CSV ─┐
├─ KPI cards (6): DAU, MAU, Revelados, Exports,    │
│   Upgrades, Listas — c/u con delta vs prev.      │
├─ Gráficos:                                        │
│   · Línea: actividad diaria (revelados/exports)  │
│   · Barras: revelados por plan                   │
│   · Donut: usuarios por plan                     │
│   · Línea: nuevos signups por día                │
├─ Tabla detallada con tabs:                       │
│   [Top usuarios] [Búsquedas top] [Eventos]       │
│   filtros propios + paginación + export CSV      │
└──────────────────────────────────────────────────┘
```

Recharts para todos los gráficos, design tokens (HSL del index.css), responsive grid.

## 5. Backend (DB + funciones)

**Nueva tabla `analytics_events`** (para login, search, filter_apply — eventos que hoy no se persisten):
- `user_id`, `event_type` (text), `payload` (jsonb), `created_at`.
- RLS: insert por usuarios autenticados (sólo su `user_id`); select sólo admins (`has_role`).
- Índices en `(event_type, created_at)` y `(user_id, created_at)`.

**Tabla `plan_changes`** para trackear upgrades:
- `user_id`, `from_plan`, `to_plan`, `created_at`. Insert desde edge function `update-plan` existente.

**Función security definer `admin_analytics_summary(_from timestamptz, _to timestamptz)`**: devuelve jsonb con todos los KPIs agregados en una llamada (DAU, MAU, revelados, exports, upgrades, listas, distrib. por plan). Verifica `has_role(auth.uid(),'admin')` y lanza si no.

**Función `admin_analytics_timeseries(_from, _to, _bucket text)`**: serie diaria/semanal de revelados, exports, signups, logins.

**Función `admin_analytics_top_users(_from, _to, _limit int)`**: top usuarios por revelados/exports.

Todas con `set search_path = public` y `security definer`.

## 6. Frontend

Archivos nuevos:
- `src/pages/admin/AdminAnalytics.tsx` — página completa.
- `src/components/admin/analytics/KpiCard.tsx` — card reusable con delta.
- `src/components/admin/analytics/DateRangeControl.tsx` — selector con presets + custom + toggle compare.
- `src/components/admin/analytics/ActivityChart.tsx`, `PlanDistributionChart.tsx`, `RevealsByPlanChart.tsx`, `SignupsChart.tsx`.
- `src/components/admin/analytics/TopUsersTable.tsx`, `SearchesTable.tsx`, `EventsTable.tsx` (tabs).
- `src/hooks/useAdminAnalytics.ts` — TanStack Query hooks que llaman las RPC con `{from,to}` y `{compareFrom,compareTo}`.
- `src/lib/analyticsCsv.ts` — export CSV de la vista actual.

Archivos editados:
- `src/App.tsx` — ruta `/admin/analytics` con guard admin.
- `src/components/dashboard/AppSidebar.tsx` — entrada "Analytics" para admins.
- Instrumentación mínima en `Auth.tsx` (login event), `DataFilters.tsx` (search event) → insert en `analytics_events`.

## 7. Performance

- Las RPC agregan en SQL (no traer filas crudas). Indexar `email_reveals.created_at`, `export_logs.created_at`, `lists.created_at`, `analytics_events(event_type,created_at)`.
- TanStack Query con `staleTime` 60s, key incluye rango.
- Para "Todo el tiempo" en datasets grandes, capear a últimos 365 días con aviso.

## 8. Fuera de alcance

- Funnels avanzados, segmentación multi-dimensión, A/B testing.
- Alertas/emails automáticos de métricas.
- Dashboards configurables por el usuario.

## Flujo de implementación

1. Migración: `analytics_events`, `plan_changes`, índices, 3 funciones RPC, RLS.
2. Hook `useAdminAnalytics` + página `/admin/analytics` con KPIs + gráficos.
3. Tabs de tabla (top users, eventos) + export CSV.
4. Instrumentación de login/search.
5. Link en sidebar + guard de ruta.
