# Migracion a Redesign - ContarStock v2

**Fecha:** 2026-07-02

---

## Resumen

| Decision | Justificacion |
|----------|---------------|
| Consolidar UI en `redesign/pages/` | Eliminar duplicacion de codigo |
| Mantener `features/` con domain/hooks | La logica de negocio no debe duplicarse |
| Eliminar paginas legacy duplicadas | ~15,000 lineas de codigo removidas |
| Redirigir rutas legacy a redesign | Compatibilidad hacia atras sin mantener codigo |

---

## Archivos Eliminados

```
src/features/capture/CapturePage.tsx        ->  Usar redesign/pages/CapturePage.tsx
src/features/counting/CountingPage.tsx       ->  Usar redesign/pages/CountingPage.tsx
src/features/customers/CustomersPage.tsx     ->  Usar redesign/pages/CustomersPage.tsx
src/features/data/DataPage.tsx               ->  Usar redesign/pages/DataPage.tsx
src/features/dynamic/DynamicManagementPage.tsx ->  ELIMINADO (redirige a /data)
src/features/events/EventsPage.tsx            ->  Redirige a /reports
src/features/expected-orders/ExpectedOrdersPage.tsx ->  Redirige a /reports
src/features/expiry/ExpiryPage.tsx           ->  Usar redesign/pages/ExpiryPage.tsx
src/features/hammer/HammerPage.tsx            ->  Usar redesign/pages/HammerPage.tsx
src/features/reception/ReceptionPage.tsx     ->  Redirige a /capture
src/features/reports/ReportsPage.tsx          ->  Usar redesign/pages/ReportsPage.tsx
src/features/settings/SettingsPage.tsx        ->  Usar redesign/pages/SettingsPage.tsx
src/features/slices/SlicesPage.tsx           ->  Usar redesign/pages/SlicesPage.tsx
src/features/suppliers/pages/SuppliersPage.tsx ->  Usar redesign/pages/SuppliersPage.tsx
src/features/sync/SyncPage.tsx               ->  Usar redesign/pages/SyncPage.tsx
```

---

## Estructura Consolidada

```
src/
├── features/                          # Logica de negocio (MANTENER)
│   ├── expiry/
│   │   ├── domain/                   # Logica pura (evaluaciones, calculos)
│   │   ├── hooks/                    # Estado React (useExpiry, etc.)
│   │   ├── components/               # Componentes reutilizables
│   │   └── utils/                    # Utilidades especificas
│   ├── counting/                      # Misma estructura
│   ├── events/                        # Misma estructura
│   └── ...
│
├── shared/components/redesign/
│   └── pages/                        # UI del rediseño (UNICA UBICACION)
│       ├── ExpiryPage.tsx           # Importa de features/expiry/hooks
│       ├── CapturePage.tsx          # Importa de features/...
│       └── ...
│
├── services/                         # Servicios globales
├── db/                               # IndexedDB (Dexie)
└── stores/                           # Estado global (Zustand)
```

---

## Como Agregar un Nuevo Modulo

### Paso 1: Crear en `features/` (logica de negocio)

```
src/features/nuevo-modulo/
├── domain/
│   └── nuevoModuloDomain.ts     # Logica pura
├── hooks/
│   └── useNuevoModulo.ts        # Estado React
└── components/                  # Componentes reutilizables
```

### Paso 2: Crear pagina UI en `redesign/pages/`

```
src/shared/components/redesign/pages/NuevoModuloPage.tsx

// Imports desde features/
import { useNuevoModulo } from '@/features/nuevo-modulo/hooks';
import { NuevoModal } from '@/features/nuevo-modulo/components';
```

### Paso 3: Agregar ruta en `App.tsx`

```tsx
const NuevoModuloPage = lazyWithRetry(() => 
  import('@/shared/components/redesign').then(m => ({ default: m.NuevoModuloPage }))
);

<Route path="/nuevo-modulo" element={<NuevoModuloPage />} />
```

---

## Patrones del Redesign

| Patron | Ejemplo |
|--------|---------|
| Imports de hooks | `import { useExpiry } from '@/features/expiry/hooks'` |
| Imports de componentes | `import { ExpiryCaptureModal } from '@/features/expiry/components'` |
| Tipos compartidos | `import type { ExpiryRecord } from '@/features/expiry/hooks'` |
| Tema dark/light | Usar variables CSS `--bg-base`, `--text-primary` |
| Nomenclatura archivos | PascalCase: `ExpiryPage.tsx`, camelCase: `useExpiry.ts` |

---

## Variables CSS del Tema

```css
/* Fondo */
--bg-base       /* #09090b - Fondo principal */
--bg-surface    /* #18181b - Cards, modales */
--bg-elevated   /* #27272a - Elementos elevados */

/* Texto */
--text-primary   /* #f4f4f5 */
--text-secondary /* #a1a1aa */
--text-muted     /* #71717a */

/* Bordes */
--border-subtle  /* rgba(255,255,255,5%) */

/* Acento */
--color-primary  /* #3b82f6 */
```

---

## Redirecciones de Rutas Legacy

| Ruta Antigua | Destino |
|-------------|---------|
| `/events` | `/reports` |
| `/counting` | `/reports` |
| `/expected-orders` | `/reports` |
| `/reception` | `/capture` |
| `/dynamic/*` | `/data` |
| `/database` | `/data` |

---

## Carpetas Mantenidas en features/

| Modulo | domain | hooks | components | services | utils |
|--------|--------|-------|------------|----------|-------|
| counting | Si | Si | Si | - | - |
| customers | Si | Si | Si | - | - |
| dashboard | - | Si | Si | - | - |
| events | Si | Si | Si | Si | - |
| expected-orders | Si | Si | Si | - | Si |
| expiry | Si | Si | Si | Si | Si |
| hammer | - | Si | Si | - | - |
| inventory | Si | Si | Si | - | - |
| product | - | - | Si | - | - |
| reception | Si | Si | Si | Si | Si |
| reports | - | Si | Si | - | - |
| settings | - | Si | Si | - | - |
| slices | Si | Si | Si | Si | Si |
| suppliers | Si | Si | Si | - | Si |
| sync | - | Si | Si | Si | - |
| app | - | Si | Si | - | - |

---

## Modulos No Migrados (Tienen pagina solo en features/)

Estos modulos aun no tienen pagina en `redesign/pages/`:

| Modulo | Archivo actual | Estado |
|--------|---------------|--------|
| inventory | `features/inventory/InventoryPage.tsx` | Pendiente migrar UI |
| reports/AuditPage | `features/reports/AuditPage.tsx` | Pendiente migrar UI |

---

## Hooks Compartidos

Los hooks reutilizables estan en:

| Ubicacion | Uso |
|-----------|-----|
| `src/hooks/` | Hooks globales (useAutoSync, useTheme, etc.) |
| `src/features/*/hooks/` | Hooks especificos de modulo |
| `src/shared/features/*/hooks/` | Hooks compartidos entre modulos |

---

## Commits Relacionados

- `01d36100` - feat: Mostrar fecha de retiro en cada registro
- `80fea256` - feat: Mostrar fecha de retiro calculada en modal
- `696a2fc5` - feat: Usar ExpiryCaptureModal real con busqueda de productos
- `[proximamente]` - refactor: Consolidar UI en redesign/pages/, eliminar duplicados
