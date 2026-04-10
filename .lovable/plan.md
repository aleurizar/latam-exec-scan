

## Plan: Sistema de Planes con Créditos de Email y Página de Settings

### Resumen
Reemplazar los planes actuales (basic/professional/enterprise) por **basic/silver/gold**, implementar un sistema de créditos para desbloquear emails de ejecutivos, crear una página de Settings completa con gestión de plan y uso de créditos, y un dashboard de admin.

### Cambios en Base de Datos

1. **Actualizar enum `plan_type`**: Renombrar valores a `basic`, `silver`, `gold`
2. **Crear tabla `email_reveals`**: Registra cada desbloqueo de email (user_id, executive_id, created_at). RLS: usuarios ven solo los propios.
3. **Crear función `get_email_credit_limit(plan)`**: Retorna 100/1000/2000 según plan.
4. **Crear función `get_used_credits(user_id)`**: Cuenta registros en `email_reveals` para el usuario.
5. **Actualizar perfiles existentes**: Cambiar `professional`/`enterprise` a `basic`.

### Cambios en Frontend

#### Nuevos archivos

1. **`src/pages/Settings.tsx`** — Página con layout de sidebar izquierdo + contenido derecho. Menú lateral con items: Perfil, Plan y Créditos, Notificaciones (placeholder), Seguridad (placeholder). Subrutas internas vía estado local.

2. **`src/pages/settings/PlanSettings.tsx`** — Muestra plan actual (basic/silver/gold) con badge, botón "Upgrade Plan" que lleva a la vista de upgrade.

3. **`src/pages/settings/UpgradePlan.tsx`** — Tres cards comparativas (Basic Free / Silver / Gold) con features y botón "Elegir plan". Al elegir, actualiza el perfil via edge function (para evitar bypass de RLS).

4. **`src/pages/settings/CreditUsage.tsx`** — Muestra créditos disponibles vs consumidos con barra de progreso, lista de últimos desbloqueos con fecha y nombre del ejecutivo.

5. **`src/pages/settings/AdminUsers.tsx`** — Solo visible para admins. Tabla con usuarios, su plan, y créditos consumidos/disponibles.

6. **`src/hooks/useEmailCredits.ts`** — Hook que consulta créditos usados y límite según plan. Expone `canRevealEmail`, `revealEmail(executiveId)`, `usedCredits`, `totalCredits`.

7. **`supabase/functions/update-plan/index.ts`** — Edge function para actualizar el plan del usuario (evita restricción RLS que impide auto-cambio de plan).

#### Archivos modificados

8. **`src/hooks/useUserPlan.ts`** — Actualizar tipos a `basic | silver | gold`.

9. **`src/components/dashboard/ExecutivesTable.tsx`** — Agregar columna Email. Mostrar email enmascarado (ej: `m***@mercadolibre.com`). Botón "+" para desbloquear que llama a `revealEmail()`. Si ya desbloqueado, mostrar email completo. Si sin créditos, mostrar mensaje.

10. **`src/pages/ExecutiveDetail.tsx`** — Misma lógica de reveal en la vista de detalle.

11. **`src/components/dashboard/AppSidebar.tsx`** — Settings navega a `/settings` en vez de abrir import. Import se mueve como submenú de Settings.

12. **`src/App.tsx`** — Agregar ruta `/settings`.

### Flujo de desbloqueo de email
1. Usuario ve email enmascarado en la tabla
2. Hace clic en botón "+" junto al email
3. Sistema verifica créditos disponibles (límite del plan - emails ya desbloqueados)
4. Si hay créditos: inserta registro en `email_reveals`, muestra email completo
5. Si no hay créditos: muestra toast sugiriendo upgrade

### Seguridad
- `email_reveals` tiene RLS: usuarios solo ven/insertan sus propios registros
- Cambio de plan via edge function con service role (no permite bypass directo)
- Dashboard admin protegido con `has_role(uid, 'admin')`

