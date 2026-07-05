# Plan de Trabajo: Pendientes ContarStock v2

**Fecha de creación:** 2026-07-05  
**Versión:** 1.0  
**Estado:** Para ejecutar

---

## Resumen Ejecutivo

Este documento detalla el plan de trabajo para abordar los 8 grupos de pendientes identificados, organizados por prioridad y estimados en tiempo.

| Prioridad | Grupos | Tiempo Estimado |
|-----------|--------|-----------------|
| 🔴 ALTA | 3 grupos | 5-7 días |
| 🟡 MEDIA | 3 grupos | 4-6 días |
| 🟢 BAJA | 2 grupos | 3-4 días |
| **TOTAL** | **8 grupos** | **12-17 días** |

---

# FASE 1: ALTA PRIORIDAD (5-7 días)

## Tarea 1.1: Consolidar Componentes UI Primitivos (2 días)

### Objetivo
Crear biblioteca unificada de componentes base en `src/shared/components/ui/`

### Componentes a Crear

```typescript
// src/shared/components/ui/
├── Button.tsx           // Botón primario
├── Input.tsx            // Input con label
├── Badge.tsx            // Badge con variantes
├── Modal.tsx            // Modal basado en <dialog>
├── Tooltip.tsx          // Tooltip accesible
├── Select.tsx           // Select unificado
├── Textarea.tsx         // Textarea con label
├── Switch.tsx           // Toggle switch
└── index.ts             // Exports centralizados
```

### Especificaciones

#### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

#### Input
```typescript
interface InputProps {
  label?: string;
  error?: string;
  helper?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}
```

#### Modal
```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

### Archivos a Modificar
1. Crear `src/shared/components/ui/Button.tsx`
2. Crear `src/shared/components/ui/Input.tsx`
3. Crear `src/shared/components/ui/Badge.tsx` (mover desde theme)
4. Crear `src/shared/components/ui/Modal.tsx`
5. Crear `src/shared/components/ui/Tooltip.tsx`
6. Crear `src/shared/components/ui/Select.tsx`
7. Crear `src/shared/components/ui/Switch.tsx`
8. Crear `src/shared/components/ui/Textarea.tsx`
9. Crear `src/shared/components/ui/index.ts`
10. Actualizar imports en `src/index.css` con variables CSS

### Criterios de Aceptación
- [ ] Todos los componentes con TypeScript correcto
- [ ] Tests para cada componente (>80% coverage)
- [ ] Storybook o documentación de uso
- [ ] Migración gradual de componentes existentes

### Checklist de Ejecución
- [ ] Crear estructura de carpetas `src/shared/components/ui/`
- [ ] Implementar Button.tsx
- [ ] Implementar Input.tsx
- [ ] Implementar Badge.tsx
- [ ] Implementar Modal.tsx
- [ ] Implementar Tooltip.tsx
- [ ] Implementar Select.tsx
- [ ] Implementar Switch.tsx
- [ ] Implementar Textarea.tsx
- [ ] Crear index.ts con exports
- [ ] Migrar 5 componentes legacy a usar nuevos
- [ ] Agregar tests

---

## Tarea 1.2: Refactorizar CountingPage (2 días)

### Objetivo
Dividir el archivo monolítico `CountingPage.tsx` (490 líneas) en componentes modulares

### Estructura Actual vs Objetivo

**ANTES (CountingPage.tsx - 490 líneas):**
```
features/counting/
└── CountingPage.tsx    # Monolítico, todo junto
```

**DESPUÉS:**
```
features/counting/
├── CountingPage.tsx              # Orchestrator (~100 líneas)
├── components/
│   ├── CountingHeader.tsx       # Título + stats (~80 líneas)
│   ├── CountingGrid.tsx         # Grid virtualizado (~100 líneas)
│   ├── CountingFAB.tsx          # FAB + modal (~60 líneas)
│   ├── CountingFilters.tsx      # Filtros (~40 líneas)
│   ├── CountingEmptyState.tsx   # Estado vacío (~30 líneas)
│   └── index.ts                 # Exports
├── domain/
│   ├── countingDomain.ts        # ✅ Ya existe
│   ├── countingDomain.test.ts   # ✅ Ya existe
│   └── index.ts                 # ✅ Ya existe
└── hooks/
    ├── useCounting.ts           # ⚠️ Refactorizar
    ├── useProductivity.ts       # ✅ Ya existe
    ├── useTurboMode.ts          # ✅ Ya existe
    └── index.ts                 # ✅ Ya existe
```

### Componentes a Crear

#### CountingHeader.tsx
```typescript
// Responsabilidades:
// - Título de la sesión
// - Estadísticas (items contados, tiempo, velocidad)
// - Botones de acciones (reset, pause, settings)
// Props:
// - sessionName: string
// - metrics: CountingMetrics
// - onReset: () => void
// - onPause: () => void
```

#### CountingGrid.tsx
```typescript
// Responsabilidades:
// - Lista virtualizada de productos contados
// - Búsqueda inline
// - Ordenamiento
// - Selección múltiple
// Props:
// - items: CountedItem[]
// - onItemClick: (item) => void
// - onItemDelete: (item) => void
```

#### CountingFAB.tsx
```typescript
// Responsabilidades:
// - FAB flotante para agregar producto
// - Modal de captura de barcode
// - Validación de producto
// Props:
// - onProductCaptured: (product) => void
// - isOpen: boolean
// - onToggle: () => void
```

### Archivos a Modificar
1. Modificar `features/counting/CountingPage.tsx` (reducir a orchestrator)
2. Crear `features/counting/components/CountingHeader.tsx`
3. Crear `features/counting/components/CountingGrid.tsx`
4. Crear `features/counting/components/CountingFAB.tsx`
5. Crear `features/counting/components/CountingFilters.tsx`
6. Crear `features/counting/components/CountingEmptyState.tsx`
7. Crear `features/counting/components/index.ts`
8. Modificar `features/counting/hooks/useCounting.ts` (extraer lógica)
9. Actualizar imports en `src/App.tsx`

### Pasos de Ejecución

**Día 1:**
1. Extraer `CountingHeader.tsx` con título y stats
2. Extraer `CountingEmptyState.tsx`
3. Reducir CountingPage.tsx ~150 líneas

**Día 2:**
1. Crear `CountingGrid.tsx` con virtualización
2. Crear `CountingFAB.tsx` con modal
3. Crear `CountingFilters.tsx`
4. Finalizar CountingPage.tsx como orchestrator
5. Agregar tests para nuevos componentes

### Criterios de Aceptación
- [ ] CountingPage.tsx < 120 líneas
- [ ] CountingGrid.tsx usa virtualización (>100 items)
- [ ] Todos los componentes memoizados
- [ ] Tests覆盖率 >80%
- [ ] Sin console.log en producción

---

## Tarea 1.3: Integrar Módulos Faltantes en Redesign (3 días)

### Objetivo
Crear equivalentes en `shared/components/redesign/` para módulos en `features/` que no tienen UI de redesign

### Módulos a Implementar

#### 1. Events Module (1 día)
**Prioridad:** 🔴 Alta

```
shared/components/redesign/
└── events/
    ├── EventsPage.tsx           # Wrappers
    ├── EventCard.tsx            # Card de evento
    ├── EventFilters.tsx         # Filtros
    └── EventDetail.tsx          # Detalle
```

**Implementación:**
```typescript
// EventsPage.tsx
import { EventsPage as LegacyEventsPage } from '@/features/events/EventsPage';
import { RedesignWrapper } from '../components/RedesignWrapper';

// Usar componentes legacy con tema redesign
export const RedesignEventsPage = () => {
  return (
    <RedesignWrapper>
      <LegacyEventsPage />
    </RedesignWrapper>
  );
};
```

#### 2. Customers Module (0.5 días)
**Prioridad:** 🔴 Alta

```
shared/components/redesign/
└── customers/
    ├── CustomersPage.tsx
    └── CustomerCard.tsx
```

#### 3. Suppliers Module (0.5 días)
**Prioridad:** 🔴 Alta

```
shared/components/redesign/
└── suppliers/
    ├── SuppliersPage.tsx
    └── SupplierCard.tsx
```

#### 4. RedesignWrapper Component (0.5 días)
**Prioridad:** 🔴 Crítica

```typescript
// RedesignWrapper.tsx
interface RedesignWrapperProps {
  children: ReactNode;
  className?: string;
}

// Aplica:
// - Tema monocromático
// - Variables CSS del sistema de diseño
// - Animaciones de transición
```

### Pasos de Ejecución

**Semana 1 - Events:**
- [ ] Crear `RedesignWrapper.tsx`
- [ ] Crear `events/EventsPage.tsx` (wrapper)
- [ ] Crear `events/EventCard.tsx`
- [ ] Crear `events/EventFilters.tsx`
- [ ] Actualizar routing

**Semana 1 - Customers & Suppliers:**
- [ ] Crear `customers/CustomersPage.tsx`
- [ ] Crear `suppliers/SuppliersPage.tsx`
- [ ] Actualizar routing

### Criterios de Aceptación
- [ ] Events tiene equivalente en redesign
- [ ] Customers tiene equivalente en redesign
- [ ] Suppliers tiene equivalente en redesign
- [ ] RedesignWrapper funciona para cualquier módulo

---

# FASE 2: MEDIA PRIORIDAD (4-6 días)

## Tarea 2.1: Migrar Hooks Globales a Módulos (2 días)

### Objetivo
Reorganizar hooks para seguir arquitectura Lego

### Hooks a Migrar

| Hook Actual | Destino | Complejidad |
|-------------|---------|-------------|
| `useAudit` | `features/sync/hooks/` | Baja |
| `useBulkActions` | `shared/hooks/` | Media |
| `useBulkActionsAdvanced` | `shared/hooks/` | Media |
| `useConflictResolution` | `services/sync/` | Alta |
| `useExpiryWatcher` | `features/expiry/hooks/` | Baja |
| `useGlobalSearch` | `app/providers/` | Media |
| `useHIDScanner` | `shared/hooks/` | Media |

### Estructura Objetivo

```
src/
├── shared/
│   └── hooks/
│       ├── index.ts                    # ✅ Existe
│       ├── useProductivity.ts         # ✅ Existe
│       ├── useTurboMode.ts            # ✅ Existe
│       ├── useBulkActions.ts          # 📋 CREAR
│       ├── useBulkActionsAdvanced.ts  # 📋 CREAR
│       └── useHIDScanner.ts            # 📋 MOVER
│
├── features/
│   ├── sync/
│   │   └── hooks/
│   │       ├── index.ts                # 📋 CREAR
│   │       ├── useAudit.ts             # 📋 MOVER
│   │       └── useConflictResolution.ts # 📋 MOVER
│   │
│   ├── expiry/
│   │   └── hooks/
│   │       ├── index.ts                # 📋 CREAR
│   │       └── useExpiryWatcher.ts     # 📋 MOVER
│   │
│   └── ...
│
└── app/
    └── providers/
        └── useGlobalSearch.ts          # 📋 MOVER
```

### Pasos de Ejecución

**Día 1:**
1. Crear `features/sync/hooks/index.ts`
2. Mover `useAudit` a `features/sync/hooks/`
3. Mover `useConflictResolution` a `services/sync/`
4. Actualizar imports en todos los consumidores

**Día 2:**
1. Crear `shared/hooks/useBulkActions.ts`
2. Mover lógica de bulk actions
3. Crear `features/expiry/hooks/index.ts`
4. Mover `useExpiryWatcher`
5. Verificar que no hay imports rotos

### Criterios de Aceptación
- [ ] Ningún hook duplicado
- [ ] Imports centralizados en cada módulo
- [ ] Sin imports circulares
- [ ] Tests pasan

---

## Tarea 2.2: Dividir Services de Exportación (2 días)

### Objetivo
Dividir `export.ts` en servicios modulares

### Estructura Actual

```
src/services/
├── export.ts          # ❌ ~50 funciones mezcladas
├── index.ts
└── ...
```

### Estructura Objetivo

```
src/services/
├── export/
│   ├── index.ts                    # Exports centralizados
│   ├── products.ts                 # Exportar productos
│   ├── sessions.ts                 # Exportar sesiones
│   ├── reports.ts                  # Generar reportes
│   ├── pdf.ts                      # Generación PDF
│   └── excel.ts                    # Generación Excel
│
├── sync/
│   ├── index.ts                    # ✅ Ya existe
│   ├── SyncOrchestrator.ts         # ✅ Ya existe
│   └── ...
│
└── initialization/
    ├── index.ts                    # ✅ Ya existe
    └── ...
```

### Pasos de Ejecución

**Día 1:**
1. Crear carpeta `src/services/export/`
2. Mover funciones de `products` a `export/products.ts`
3. Mover funciones de `sessions` a `export/sessions.ts`
4. Crear `export/index.ts` con re-exports
5. Actualizar imports en `src/services/index.ts`

**Día 2:**
1. Mover funciones de `reports` a `export/reports.ts`
2. Mover funciones de `pdf` a `export/pdf.ts`
3. Mover funciones de `excel` a `export/excel.ts`
4. Verificar build pasa
5. Documentar API de cada módulo

### Criterios de Aceptación
- [ ] `export.ts` eliminado o mínimo
- [ ] Cada módulo tiene su archivo
- [ ] Tests pasan
- [ ] JSDoc en cada función exportada

---

## Tarea 2.3: Virtualización de Listas (2 días)

### Objetivo
Agregar virtualización a InventoryPage y EventsPage

### Componentes a Modificar

#### InventoryPage
```typescript
// Requerimientos:
// - Lista de >100 productos
// - Búsqueda instantánea
// - Ordenamiento
// - Lazy loading

// Solución: Usar react-window o @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: products.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72, // altura de Card
  overscan: 10,
});
```

#### EventsPage
```typescript
// Requerimientos:
// - Lista variable de eventos
// - Filtros por fecha
// - Agrupamiento por día

// Solución: Combinar virtualización con grouping
```

### Archivos a Modificar
1. `features/inventory/InventoryPage.tsx`
2. `features/events/EventsPage.tsx`
3. `features/customers/CustomersPage.tsx` (ya tiene, verificar)

### Pasos de Ejecución

**Día 1 - Inventory:**
1. Instalar `@tanstack/react-virtual` si no existe
2. Modificar InventoryPage para usar virtualizer
3. Mantener búsqueda y filtros funcionales
4. Agregar loading skeleton
5. Tests de performance

**Día 2 - Events:**
1. Modificar EventsPage para usar virtualizer
2. Implementar grouping con headers sticky
3. Verificar filtros funcionan
4. Tests

### Criterios de Aceptación
- [ ] InventoryPage virtualizado, 60fps scroll
- [ ] EventsPage virtualizado, 60fps scroll
- [ ] Sin FOUC (flash of unstyled content)
- [ ] Lazy loading de imágenes

---

# FASE 3: BAJA PRIORIDAD (3-4 días)

## Tarea 3.1: Aumentar Coverage de Tests (2 días)

### Objetivo
Alcanzar 60% coverage total

### Estado Actual

| Módulo | Tests | Coverage |
|--------|-------|----------|
| countingDomain | 37 | ✅ ~85% |
| eventsDomain | 26 | ✅ ~80% |
| expiryDomain | 27 | ✅ ~80% |
| productsDomain | 34 | ✅ ~80% |
| counting hooks | 18 | ✅ ~75% |
| BaseRepository | 14 | ✅ ~70% |
| SyncFSM | 31 | ✅ ~85% |
| SyncMetrics | 14 | ✅ ~75% |
| UploadGroupBuilder | 14 | ✅ ~80% |
| slices/constants | 18 | ✅ ~90% |
| services/constants | 14 | ✅ ~90% |
| emailConstants | 8 | ✅ ~90% |
| **Total** | **479** | **~42%** |

### Áreas Críticas sin Tests

| Área | Coverage Actual | Target |
|------|----------------|--------|
| GenericSyncEngine | ~30% | 80% |
| SyncOrchestrator | ~20% | 80% |
| Initialization modules | ~40% | 70% |
| UI Components | ~10% | 60% |
| useSync hook | ~25% | 80% |

### Tests a Crear

```typescript
// GenericSyncEngine.test.ts (~40 tests)
// - pushIncremental
// - pullChanges
// - resolveConflict
// - retry on failure

// SyncOrchestrator.test.ts (~25 tests)
// - sync() orchestration
// - error handling
// - metrics aggregation

// useSync.test.ts (~20 tests)
// - hook state management
// - loading states
// - error states
```

### Pasos de Ejecución

**Día 1:**
1. Crear `GenericSyncEngine.test.ts`
2. Agregar 30+ tests para engine
3. Crear `SyncOrchestrator.test.ts`
4. Agregar 20+ tests para orchestrator

**Día 2:**
1. Crear tests para initialization modules
2. Agregar tests para UI components críticos
3. Verificar coverage >= 60%
4. Corregir tests fallidos

### Criterios de Aceptación
- [ ] Coverage total >= 60%
- [ ] GenericSyncEngine >= 80%
- [ ] SyncOrchestrator >= 80%
- [ ] Todos los tests pasan

---

## Tarea 3.2: Consolidar DataTable y Pagination (1-2 días)

### Objetivo
Crear componentes reutilizables para datos tabulares

### Componentes a Crear

#### DataTable
```typescript
// src/shared/components/data/
// ├── DataTable.tsx
// ├── Pagination.tsx
// ├── Column.tsx
// └── index.ts

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  loading?: boolean;
  emptyState?: ReactNode;
}

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
}
```

#### Pagination
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}
```

### Pasos de Ejecución

**Día 1:**
1. Crear `src/shared/components/data/Pagination.tsx`
2. Crear `src/shared/components/data/Column.tsx`
3. Crear `src/shared/components/data/DataTable.tsx`
4. Crear `src/shared/components/data/index.ts`

**Día 2:**
1. Migrar SuppliersPage a usar DataTable
2. Migrar CustomersPage a usar DataTable
3. Agregar tests
4. Documentar uso

### Criterios de Aceptación
- [ ] DataTable es reutilizable para cualquier tipo
- [ ] Pagination funciona con keyboard navigation
- [ ] Migrados 2+ módulos existentes
- [ ] Tests >80%

---

# CRONOGRAMA RESUMEN

```
Semana 1 (5 días)
├── Lunes:    Tarea 1.1 - Button, Input, Badge
├── Martes:   Tarea 1.1 - Modal, Tooltip, Select
├── Miércoles: Tarea 1.2 - CountingHeader, CountingEmptyState
├── Jueves:   Tarea 1.2 - CountingGrid con virtualización
└── Viernes:  Tarea 1.2 - CountingFAB, CountingFilters

Semana 2 (5 días)
├── Lunes:    Tarea 1.3 - RedesignWrapper, Events
├── Martes:   Tarea 1.3 - Customers, Suppliers
├── Miércoles: Tarea 2.1 - Migrar hooks (sync, expiry)
├── Jueves:   Tarea 2.1 - Migrar hooks (shared, global)
└── Viernes:  Tarea 2.2 - Dividir services (export)

Semana 3 (5 días)
├── Lunes:    Tarea 2.2 - Finalizar services
├── Martes:   Tarea 2.3 - Virtualizar InventoryPage
├── Miércoles: Tarea 2.3 - Virtualizar EventsPage
├── Jueves:   Tarea 3.1 - Tests GenericSyncEngine
└── Viernes:  Tarea 3.1 - Tests SyncOrchestrator

Semana 4 (5 días)
├── Lunes:    Tarea 3.1 - Tests UI components
├── Martes:   Tarea 3.2 - DataTable, Pagination
├── Miércoles: Tarea 3.2 - Migrar módulos a DataTable
├── Jueves:   Revisión y cleanup
└── Viernes:  Testing final y merge
```

---

# DEFINICIÓN DE "DONE"

Para cada tarea, está completa cuando:

1. ✅ Código implementado según especificaciones
2. ✅ Tests escritos y pasando (>80% coverage en módulo)
3. ✅ Sin `console.log` en producción
4. ✅ Sin `any` sin justificación en TypeScript
5. ✅ Build pasa sin errores ni warnings críticos
6. ✅ Importado en `index.ts` correspondiente
7. ✅ Documentación actualizada (JSDoc si necesario)

---

# RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper funcionalidad existente | Media | Alto | Tests antes/después, feature flags |
| Conflictos de merge | Media | Medio | Branches pequeños, merge frecuente |
| Dependencias circulares | Baja | Alto | ESLint rules, análisis circular |
| Bundle size increase | Baja | Medio | Tree shaking, lazy loading |
| Retrasos por bugs inesperados | Alta | Medio | Buffer de tiempo en estimación |

---

*Documento creado: 2026-07-05*
*Versión: 1.0*
*Planificador: AI Assistant*