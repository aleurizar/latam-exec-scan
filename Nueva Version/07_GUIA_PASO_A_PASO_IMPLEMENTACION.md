# 🚀 GUÍA PASO A PASO - Implementar Motor de Calificación

## ARCHIVOS GENERADOS

Están en: `/home/claude/`

```
✅ 20260608_create_motor_tables.sql  (11 KB) - Crear 4 tablas nuevas
✅ 20260608_alter_companies.sql      (4.4 KB) - Agregar 13 columnas a COMPANIES
✅ 20260608_alter_executives.sql     (3.2 KB) - Agregar 7 columnas a EXECUTIVES
✅ scoring.types.ts                  (11 KB) - Tipos TypeScript + Enums + Zod schemas
✅ scoring.empresa.ts                (11 KB) - Funciones para calcular scores empresa
```

---

## PASO 1: COPIAR SQL A TU PROYECTO

En VS Code, abrí tu proyecto: `latam-exec-scan-main` o el que tengas.

### 1.1 - Crear carpeta si no existe
```
Navega a: supabase/migrations/
```

### 1.2 - Crear archivo PRIMERO (Crear tablas)

En VS Code:
1. **Click derecho** en `supabase/migrations/`
2. **New File**
3. Nombrá: `20260608151524_create_motor_tables.sql`

### 1.3 - Copiar contenido

En navegador (Claude):
1. Abrí este documento en Chrome/Firefox
2. Buscá la sección: **"TABLE 1: CONFIG_MOTOR"**
3. Seleccioná TODO desde `-- ============` hasta el final del archivo
4. Copiar (Ctrl+C)
5. Pegá en VS Code (Ctrl+V)
6. Guardá (Ctrl+S)

---

## PASO 2: COPIAR SEGUNDO SQL (ALTER COMPANIES)

### 2.1 - Crear archivo
1. **Click derecho** en `supabase/migrations/`
2. **New File**
3. Nombrá: `20260608151525_alter_companies.sql`

### 2.2 - Copiar contenido
1. En navegador, buscá la sección: **"MIGRATION: ALTER COMPANIES"**
2. Seleccioná TODO
3. Pegá en VS Code
4. Guardá

---

## PASO 3: COPIAR TERCER SQL (ALTER EXECUTIVES)

### 3.1 - Crear archivo
1. **Click derecho** en `supabase/migrations/`
2. **New File**
3. Nombrá: `20260608151526_alter_executives.sql`

### 3.2 - Copiar contenido
1. En navegador, buscá la sección: **"MIGRATION: ALTER EXECUTIVES"**
2. Seleccioná TODO
3. Pegá en VS Code
4. Guardá

---

## PASO 4: CREAR CARPETA `lib/scoring/`

Necesitás crear una carpeta para los tipos y funciones TypeScript.

### 4.1 - Crear carpeta
1. En VS Code, navega a: `src/lib/`
2. **Click derecho** → **New Folder**
3. Nombrá: `scoring`

---

## PASO 5: COPIAR TYPES TypeScript

### 5.1 - Crear archivo
1. **Click derecho** en `src/lib/scoring/`
2. **New File**
3. Nombrá: `types.ts`

### 5.2 - Copiar contenido
1. En navegador, buscá la sección: **"TYPES - Motor de Calificación"**
2. Seleccioná TODO desde `// ============` hasta el final
3. Pegá en VS Code
4. Guardá

---

## PASO 6: COPIAR FUNCIONES EMPRESA

### 6.1 - Crear archivo
1. **Click derecho** en `src/lib/scoring/`
2. **New File**
3. Nombrá: `empresa.ts`

### 6.2 - Copiar contenido
1. En navegador, buscá la sección: **"SCORING FUNCTIONS - EMPRESA"**
2. Seleccioná TODO desde `// ============` hasta el final
3. Pegá en VS Code
4. Guardá

---

## PASO 7: EJECUTAR MIGRACIONES SQL

Una vez que hayas copiado los 3 archivos SQL, ejecutá las migraciones:

### 7.1 - Abrí la terminal en VS Code
```
Ctrl + `
```

### 7.2 - Ejecutá comando
```bash
npx supabase migration up
```

O si usas Supabase CLI:
```bash
supabase db push
```

**Esperá a que termine** (toma 30-60 segundos). Deberías ver:
```
✓ migration 20260608151524_create_motor_tables.sql
✓ migration 20260608151525_alter_companies.sql
✓ migration 20260608151526_alter_executives.sql
```

---

## PASO 8: VERIFICAR EN SUPABASE

Podés verificar que todo funcionó:

1. Abrí tu proyecto en Supabase (supabase.com)
2. Navega a **SQL Editor**
3. Ejecutá:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver:
- ✅ `config_motor`
- ✅ `empresa_scores`
- ✅ `contacto_scores`
- ✅ `registro_final_outreach`

Y las columnas nuevas en:
- ✅ `companies` (13 columnas nuevas)
- ✅ `executives` (7 columnas nuevas)

---

## PASO 9: USAR LOS TIPOS EN TU CÓDIGO

Ahora podés importar los tipos en tus componentes:

```typescript
// En cualquier archivo .ts o .tsx
import {
  Clasificacion,
  ConfigMotor,
  EmpresaScores,
  ContactoScores,
  RegistroFinalOutreach,
} from '@/lib/scoring/types';

import {
  calcularScoreFinalEmpresa,
  validarEmpresaParaScoring,
} from '@/lib/scoring/empresa';
```

---

## PASO 10: PRÓXIMOS PASOS

Una vez que todo esté funcionando, necesitás:

1. **Motor de Contactos** (funciones análogas para executives)
2. **Orquestador** (que ejecute empresa + contacto y cree REGISTRO_FINAL_OUTREACH)
3. **Admin Panel** (para configurar pesos y gates)
4. **Commercial Panel** (para ver scores y exportar)

---

## ⚠️ PROBLEMAS COMUNES

### Error: "Table already exists"
→ Las tablas ya existen. Podés ignorar o hacer DROP.

### Error: "Column already exists"
→ Las columnas ya existen. Podés ignorar.

### Error de autenticación Supabase
→ Verifica que tengas `.env.local` con SUPABASE_URL y SUPABASE_KEY correctos.

---

## ✅ CHECKLIST FINAL

- [ ] Crear 3 archivos SQL en `supabase/migrations/`
- [ ] Copiar contenido SQL
- [ ] Ejecutar `supabase db push`
- [ ] Verificar en Supabase Dashboard que tablas existen
- [ ] Crear carpeta `src/lib/scoring/`
- [ ] Copiar `types.ts` y `empresa.ts`
- [ ] Importar tipos en tus componentes
- [ ] Probar función: `calcularScoreFinalEmpresa()`

---

**¿Necesitás ayuda con algún paso? Avisá.** 👇
