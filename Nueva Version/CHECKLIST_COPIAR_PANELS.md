# ✅ CHECKLIST - Integración Manual de Panels

## PASO 1: Descargar archivos React desde Claude

En la carpeta `/mnt/user-data/outputs/` encontrás:

- [ ] `ScoringAdminPanel.tsx`
- [ ] `ScoringCommercialPanel.tsx`
- [ ] `ScoringDashboard.tsx`

**Descargálos todos.**

---

## PASO 2: Crear estructura de carpetas

En tu proyecto `App_Lovable`:

```powershell
# PowerShell en la raíz del proyecto
mkdir src\components\admin -Force
mkdir src\components\commercial -Force
mkdir src\pages -Force
```

---

## PASO 3: Copiar archivos

- [ ] **ScoringAdminPanel.tsx** → `src\components\admin\ScoringAdminPanel.tsx`
- [ ] **ScoringCommercialPanel.tsx** → `src\components\commercial\ScoringCommercialPanel.tsx`
- [ ] **ScoringDashboard.tsx** → `src\pages\ScoringDashboard.tsx`

---

## PASO 4: Verificar componentes shadcn/ui

En PowerShell en la raíz del proyecto, ejecutá:

```bash
npx shadcn-ui@latest add card
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add table
npx shadcn-ui@latest add select
```

- [ ] Todos los comandos ejecutados sin errores

---

## PASO 5: Verificar TypeScript types

Asegurate que exista **`src/lib/scoring/types.ts`** con:

```typescript
export interface ConfigMotorJSON {
  version: number;
  motor_type: string;
  pesos: {
    dimensiones: {
      relevancia: number;
      confianza: number;
      contactabilidad: number;
    };
  };
  gates: Gate[];
  umbrales_clasificacion: Record<string, [number, number]>;
}

export interface Gate {
  id: string;
  name: string;
  description: string;
  severity: 'bloqueante' | 'media' | 'baja';
  condition: string;
  max_clasificacion?: 'ALTO' | 'MEDIO' | 'BAJO' | 'BÁSICO';
}
```

- [ ] Archivo existe y tiene esas interfaces

---

## PASO 6: Actualizar routing (OPCIONAL)

Si querés que el dashboard sea fácilmente accesible, edita **`src/main.tsx`**:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import { ScoringDashboard } from './pages/ScoringDashboard'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/scoring" element={<ScoringDashboard />} />
      </Routes>
    </Router>
  </React.StrictMode>,
)
```

- [ ] Actualizado (o dejalo como estaba si no querés router)

---

## PASO 7: Build

En PowerShell en la raíz:

```bash
npm run build
```

- [ ] Build exitoso (sin errores, solo warnings de chunk size)

### Si hay errores de componentes:
→ Volvé al PASO 4 y asegurate de instalar todos

### Si hay errores de tipos:
→ Volvé al PASO 5 y verificá que `ConfigMotorJSON` + `Gate` existan

---

## PASO 8: Test local

En PowerShell:

```bash
npm run dev
```

Abrí navegador en:
- `http://localhost:5173/` (o el puerto que salga)
- Si agregaste routing, también podés ir a `http://localhost:5173/scoring`

- [ ] Dashboard carga sin errores
- [ ] Admin Panel muestra 5 tabs
- [ ] Commercial Panel muestra 3 tabs
- [ ] No hay errores en console (F12)

---

## PASO 9: Verificar funcionalidad básica

En el Admin Panel:
- [ ] Sliders de pesos funcionan
- [ ] Gates se muestran
- [ ] Tab "Simulación" visible

En el Commercial Panel:
- [ ] Tabla de "Registro Final" carga
- [ ] Filtro por clasificación funciona
- [ ] Botones de exportar/enviar a HubSpot existen

---

## 🎯 SI TODO PASÓ:

**¡Estás listo para Fase 1: Integración Supabase!**

Próximos pasos:
1. Conectar Admin Panel a `config_motor` (guardar/cargar)
2. Conectar Commercial Panel a datos reales (`empresa_scores`, `contacto_scores`)
3. Implementar botón "Ejecutar motor" → llama `orchestrator.ts`

---

## ⚠️ TROUBLESHOOTING

### Error: "Cannot find module '@/components/ui/card'"
→ Ejecutá: `npx shadcn-ui@latest add card`

### Error: "ConfigMotorJSON not found"
→ Creá `src/lib/scoring/types.ts` con el interface

### Error: "ScoringDashboard not found"
→ Verificá que `src/pages/ScoringDashboard.tsx` exista

### Build slow / warnings de chunk size
→ Normal con Vite. Podés ignorar. En producción se optimiza.

### Dashboard no carga en `/scoring`
→ Verificá que `react-router-dom` esté instalado y que main.tsx tenga Router

---

## 📞 Si necesitás ayuda:

1. Verificá este checklist de arriba a abajo
2. Checá que los paths sean exactos (no confundir `\` con `/`)
3. Limpiá caché: `npm cache clean --force && rm -r node_modules && npm install`
4. Reiniciá VS Code

---

✅ **Checklist completado** → Estás listo para la Fase 1
