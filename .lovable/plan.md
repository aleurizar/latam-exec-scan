# Plan de escalabilidad — 500k a 1M registros, cientos de usuarios concurrentes

Objetivo: que la app responda fluidamente con tablas grandes y muchos usuarios simultáneos, sin rediseñar la arquitectura.

---

## Paso 1 — Acción tuya: subir tamaño de instancia (5 min, fuera del código)

En **Backend (Lovable Cloud) → Advanced settings → Upgrade instance**, elegir un tamaño mediano/grande.
Esto da más CPU, RAM y conexiones concurrentes a la base. Sin esto, el resto del plan rinde la mitad bajo carga real.

> Hacelo cuando quieras (antes o después de implementar lo demás). Recomendado: antes de un lanzamiento o campaña.

---

## Paso 2 — Índices en la base de datos

Crear índices en las columnas más consultadas para que las queries sean instantáneas en lugar de escanear toda la tabla:

- `companies`: índices en `country`, `industry`, `size`, y un índice **GIN trigram** en `name` para búsquedas tipo "contiene".
- `executives`: índices en `company_id`, `country`, `position`, `seniority`, `email`, y GIN trigram en `full_name`.
- `email_reveals`: índice en `user_id`.
- `lists`: índice en `user_id`.
- `list_items`: índice en `list_id` y en `(item_type, item_id)`.
- Habilitar la extensión `pg_trgm` para soportar las búsquedas full-text.

Impacto esperado: búsquedas y filtros de **segundos a milisegundos**.

---

## Paso 3 — Paginación server-side real en tablas

Hoy las tablas de Empresas y Ejecutivos traen muchos registros y paginan en el navegador. Con 1M filas eso revienta.

Cambios:
- Usar `range(from, to)` de Supabase para traer **solo la página visible** (50 filas).
- Reemplazar el conteo exacto (`count: 'exact'`) por uno **estimado** (`count: 'estimated'`) para que la paginación no haga un `COUNT(*)` lento sobre la tabla entera.
- Mover los filtros (país, industria, tamaño, búsqueda) a la query SQL en lugar de filtrar en cliente.
- Subir el debounce de búsqueda de 300ms a 400ms.

Archivos: `CompaniesTable.tsx`, `ExecutivesTable.tsx`, `TablePagination.tsx`.

---

## Paso 4 — Caché en frontend con React Query

Hoy cada navegación entre vistas re-pega a la base. React Query ya está instalado (lo usa shadcn) pero no se está aprovechando para los datos.

Cambios:
- Migrar lecturas de `useEffect + supabase.from()` a `useQuery`.
- `staleTime` de 60s para tablas → no re-fetchea al volver a la vista.
- `staleTime` de 10 min para listas de filtros (países, industrias) → casi no cambian.
- Invalidación automática al crear/editar listas.

Impacto: **-60% de queries repetidas**, navegación instantánea entre vistas ya visitadas.

---

## Paso 5 — Arreglar N+1 en panel de admin

`AdminUsers.tsx` hace una query `get_used_credits` **por cada usuario** (con 200 usuarios = 200 queries). Reemplazar por:

- Una sola query agregada vía función RPC nueva: `get_all_users_with_credits()` (security definer, solo admins).
- Devuelve todos los usuarios con sus créditos usados en una sola llamada.

---

## Paso 6 — Optimizar Edge Functions

- `import-data`: subir el tope de 5000 a 10000 filas por llamada, procesando en chunks internos de 1000.
- Validar que las funciones reusen el cliente Supabase (no recrearlo por request).

---

## Detalle técnico

```text
Capa            Cambio                              Impacto bajo carga
─────────────────────────────────────────────────────────────────────
Infra           Upgrade instance (acción usuario)   3x–10x throughput
DB              7 índices + extensión pg_trgm       Búsqueda 100x rápida
DB              Paginación range + count estimado   O(1) vs O(n) por página
Frontend        React Query con staleTime           -60% queries repetidas
Backend         RPC agregada para AdminUsers        N queries → 1
Edge Funcs      Tope import 10k + chunks            +2x throughput import
```

## Orden de implementación

1. Migración SQL: extensión `pg_trgm` + 7 índices + función RPC `get_all_users_with_credits` (paso 2 y parte del 5).
2. Refactor de `CompaniesTable` y `ExecutivesTable` con paginación server-side y filtros en SQL (paso 3).
3. Migración a React Query en las vistas principales (paso 4).
4. Refactor de `AdminUsers.tsx` para usar la RPC nueva (paso 5).
5. Update de `import-data` edge function (paso 6).

## Lo que NO incluye este plan

- Cambios visuales / UI (todo se mantiene igual).
- Realtime en tablas grandes (deliberadamente evitado para no consumir conexiones).
- CDN externo o réplicas de lectura (no necesario hasta superar 1M usuarios).
- Cambios en autenticación, planes, RLS o lógica de negocio.

Cuando aprobés, arranco por el paso 1 (migración SQL) y voy avanzando.
