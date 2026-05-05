
## Plan: Activar planes Silver/Gold con checkout simulado y email de confirmación

### Contexto del problema
El error real al cambiar de plan es: `invalid input value for enum plan_type: "silver"`. La migración previa creó las funciones con los nuevos nombres (basic/silver/gold) pero **el enum `plan_type` en la base de datos todavía tiene los valores viejos** (basic/professional/enterprise). Por eso falla al guardar Silver o Gold.

---

### Parte 1 — Arreglar el upgrade (Problema 1)

**1.1 Migrar el enum `plan_type`**
- Renombrar valores existentes: `professional` → `silver`, `enterprise` → `gold` (Postgres soporta `ALTER TYPE ... RENAME VALUE`).
- Esto preserva los datos actuales y deja el enum alineado con lo que envía el frontend y la edge function.

**1.2 Verificar la edge function `update-plan`**
- Ya está bien: valida el plan, usa service role y actualiza `profiles.plan`. Solo fallaba por el enum.
- Una vez migrado el enum, el botón "Elegir plan" en Silver/Gold funcionará y el usuario obtiene **todas las propiedades del plan** (créditos según `get_email_credit_limit`: 100/1000/2000). No hace falta tocar nada más para que "tenga las propiedades del plan".

---

### Parte 2 — Checkout simulado tipo Stripe (sin cobro real)

Crear una pantalla intermedia entre "Elegir plan" y la activación, que se vea profesional como un checkout real pero **sin procesar pago**. Cuando esté listo conectar Stripe/Paddle, se reemplaza solo esta pantalla.

**2.1 Nueva página `src/pages/settings/CheckoutSimulado.tsx`**
Layout en dos columnas estilo Stripe Checkout:
- **Izquierda (resumen del pedido):**
  - Nombre del plan elegido (Silver o Gold)
  - Precio mensual ($49 o $99)
  - Lista de features incluidas
  - Subtotal / Total
- **Derecha (formulario de pago — solo visual):**
  - Email (precargado del usuario logueado, deshabilitado)
  - Nombre en la tarjeta
  - Número de tarjeta (input con máscara `4242 4242 4242 4242`)
  - MM/AA y CVC
  - Dirección de facturación (país + código postal)
  - Botón "Pagar $XX/mes"
- Aviso visible arriba o abajo: **"Modo demo — no se procesará ningún cobro real"** (badge sutil tipo "Test mode").
- Logos falsos de Visa/Mastercard para el realismo.

**2.2 Flujo**
1. Usuario en `UpgradePlan` clickea "Elegir plan" en Silver/Gold.
2. En vez de llamar directo a `update-plan`, navega a la vista de checkout simulado con el plan seleccionado.
3. Usuario completa el formulario (validación básica de campos, sin verificar la tarjeta).
4. Al hacer "Pagar":
   - Muestra estado "Procesando..." 1–2 segundos (simula latencia).
   - Llama a la edge function `update-plan` (la que ya existe).
   - Llama a la edge function nueva `send-subscription-email` (ver Parte 3).
   - Redirige a `PlanSettings` con un toast de éxito tipo "¡Bienvenido a Silver!".
5. Plan Basic (gratis) sigue activándose directo sin pasar por checkout.

**2.3 Integración con Settings**
- Agregar la vista `"checkout"` al estado `SettingsView` en `Settings.tsx`.
- Botón "Atrás" del checkout vuelve a `upgrade`.

---

### Parte 3 — Email transaccional al confirmar suscripción

**Servicio recomendado: Lovable Emails (built-in)**

Lovable tiene infraestructura de email transaccional integrada — no requiere cuenta externa, API keys ni configuración de Resend/SendGrid. Usa tu propio dominio (con verificación DNS) y maneja automáticamente:
- Cola con reintentos
- Supresión de bounces/quejas
- Link de unsubscribe (footer agregado automáticamente)
- Templates en React Email (.tsx) con tu branding

**Alternativa:** si preferís Resend explícitamente (porque ya tenés cuenta o querés usarlo para marketing también), también está disponible como connector. Recomiendo arrancar con Lovable Emails porque es cero-config.

**3.1 Setup de infraestructura de email**
- Configurar dominio de envío (paso guiado por la UI de Lovable — necesitás un dominio propio donde puedas agregar registros DNS, ej: `notify.tudominio.com`).
- Si todavía no tenés dominio listo, podemos crear todo el código y dejarlo listo para activarse cuando configures el dominio.

**3.2 Template `subscription-confirmation.tsx`**
- Saludo personalizado con el nombre del usuario.
- Confirmación del plan activado (Silver o Gold).
- Resumen de beneficios (X créditos de email/mes, etc.).
- Botón CTA "Ir al dashboard".
- Footer con marca.

**3.3 Disparo del email**
- Después del `update-plan` exitoso, el frontend invoca `send-transactional-email` con:
  - `templateName: "subscription-confirmation"`
  - `recipientEmail`: email del usuario
  - `templateData: { name, plan, credits }`
  - `idempotencyKey`: `subscription-${userId}-${plan}-${timestamp}` para evitar duplicados.

---

### Parte 4 — Detalles técnicos

**Archivos a crear:**
- Migración SQL: rename de valores del enum `plan_type`
- `src/pages/settings/CheckoutSimulado.tsx`
- `supabase/functions/_shared/transactional-email-templates/subscription-confirmation.tsx`
- (Auto-generado por scaffold) `supabase/functions/send-transactional-email/`, `handle-email-unsubscribe/`, `handle-email-suppression/`, página `/unsubscribe`

**Archivos a modificar:**
- `src/pages/Settings.tsx` (agregar vista `checkout`)
- `src/pages/settings/UpgradePlan.tsx` (en lugar de invocar update-plan, navegar al checkout simulado)

**Sin cambios:**
- Edge function `update-plan` ya está correcta.
- Hooks `useUserPlan` / `useEmailCredits` ya están alineados con basic/silver/gold.

---

### Preguntas antes de implementar

1. **Dominio de email:** ¿Tenés un dominio propio donde podamos configurar el envío (ej: `tudominio.com`)? Si no, podemos dejar el código listo y activar el envío cuando lo tengas.
2. **Diseño del checkout:** ¿Querés que copie visualmente Stripe Checkout (fondo gris, card blanca centrada, dos columnas) o que use el branding actual de tu app?
3. **Plan Basic (gratis):** ¿Confirmás que Basic NO debe pasar por el checkout (se activa directo)? Es lo que tiene más sentido pero quiero confirmar.
