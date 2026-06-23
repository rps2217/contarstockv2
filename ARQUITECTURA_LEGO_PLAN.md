# Plan de Refactorización: Arquitectura Lego

## Visión General

Transformar ContarStock v2 en una aplicación modular con arquitectura "Lego" donde cada módulo sea:
- **Autónomo**: Cada módulo tiene su propia lógica de dominio
- **Reutilizable**: Componentes compartidos via `shared/`
- **Testeable**: Cada módulo tiene tests unitarios
- **De alto rendimiento**: Lazy loading, memoización, virtualización

---

## Estado Actual vs. Arquitectura Objetivo

### Estado Actual (Problemas Identificados)

```
src/
├── components/           # Mezcla de componentes legacy y nuevos (28 archivos)
├── features/             # Módulos de negocio (varía en estructura)
│   ├── counting/
│   ├── events/
│   ├── expiry/
│   ├── inventory/
│   └── ...
├── hooks/               # ~28 hooks a nivel global (acoplamiento)
├── repositories/        # ~20 repositories (patrón mixto)
├── services/            # ~50 servicios (responsabilidad difusa)
├── shared/              # Componentes compartidos (partial)
├── stores/              # 5 stores (parcialmente centralizados)
└── types/               # Tipos dispersos
```

### Arquitectura Objetivo (Lego Architecture)

```
src/
├── app/                          # Orquestación
│   ├── App.tsx                   # Router + providers
│   ├── providers/                # Context providers
│   └── routes/                   # Definición de rutas
│
├── modules/                     # MÓDULOS LEGO (cada uno es autónomo)
│   ├── counting/
│   │   ├── domain/               # Lógica pura (sin UI/React)
│   │   ├── hooks/                 # useCounting, useProductivity
│   │   ├── components/           # Componentes específicos
│   │   └── tests/
│   │
│   ├── events/
│   ├── expiry/
│   ├── inventory/
│   ├── sync/
│   └── ...
│
├── shared/                       # COMPONENTES COMPARTIDOS
│   ├── components/
│   │   ├── ui/                   # Primitivos: Button, Input, Badge, Modal
│   │   ├── layout/               # DualView, Splitter, AppShell
│   │   ├── scanner/              # CameraScanner, BarcodeInput
│   │   └── data/                 # DataTable, VirtualList, Pagination
│   │
│   ├── hooks/                    # useDebounce, useLocalStorage, useMediaQuery
│   ├── utils/                   # formatDate, formatNumber, cn()
│   └── types/                   # Tipos comunes
│
├── infrastructure/              # Persistencia y API
│   ├── database/                 # Dexie, migrations
│   ├── repositories/             # Patrón Repository
│   ├── api/                     # Supabase, REST
│   └── sync/                    # Sync engine
│
├── core/                         # Servicios transversales
│   ├── services/                 # Logger, Audio, Analytics
│   └── stores/                   # Stores globales (Zustand)
│
└── types/                        # Tipos globales
```

---

## Análisis por Módulo

### Módulo: Counting (Conteo)

| Aspecto | Estado Actual | Target |
|---------|--------------|--------|
| **Domain** | ❌ Mezclado en hooks | ✅ `domain/countingDomain.ts` |
| **Components** | ⚠️ CountingPage.tsx (490 líneas) | ✅ Dividido en sub-componentes |
| **Hooks** | ✅ useProductivity, useTurboMode | ✅ Mantener |
| **Tests** | ✅ 16 tests | ✅ Expandir |
| **Performance** | ⚠️ Sin virtualización | ✅ VirtualList para >100 items |

**Acciones:**
1. Extraer `countingDomain.ts` con lógica de evaluación
2. Dividir `CountingPage.tsx` en:
   - `CountingHeader.tsx` (título, stats)
   - `CountingGrid.tsx` (virtualizado)
   - `CountingFAB.tsx` (FAB con modal)
3. Mover componentes a `modules/counting/components/`
4. Agregar virtualización con `react-window`

---

### Módulo: Events (Eventos)

| Aspecto | Estado Actual | Target |
|---------|--------------|--------|
| **Domain** | ✅ `eventsDomain.ts` (completo) | ✅ Referencia |
| **Components** | ⚠️ `EventsPage.tsx` (400+ líneas) | ✅ `EventList.tsx`, `EventDetail.tsx` |
| **Hooks** | ✅ `useEvents.ts`, `useEventUI.ts` | ✅ Refactorizado |
| **Tests** | ✅ 26 tests | ✅ Mantener |
| **Pattern** | ✅ Arquitectura v2 implementada | ✅ Referencia |

**Acciones:**
1. Mover a estructura `modules/events/` si no existe
2. Verificar que `EventCard`, `EventStatsBar` están en `components/`
3. Consolidar hooks en `hooks/index.ts`

---

### Módulo: Expiry (Vencimientos)

| Aspecto | Estado Actual | Target |
|---------|--------------|--------|
| **Domain** | ✅ `expiryDomain.ts` (completo) | ✅ Referencia |
| **Components** | ✅ Refactorizado v2 | ✅ `ExpiryPage`, `ExpiryCard`, `ExpiryStatsBar` |
| **Hooks** | ✅ `useExpiry.ts` | ✅ Mantener |
| **Tests** | ✅ 27 tests | ✅ Mantener |
| **Pattern** | ✅ Arquitectura v2 implementada | ✅ Referencia |

**Acciones:**
1. Verificar estructura en `modules/expiry/`
2. Consolidar exports en `index.ts`

---

### Módulo: Inventory (Productos)

| Aspecto | Estado Actual | Target |
|---------|--------------|--------|
| **Domain** | ✅ `productsDomain.ts` | ✅ 34 tests |
| **Components** | ⚠️ `InventoryPage.tsx` (varío) | ✅ `ProductCard`, `ProductStatsBar` |
| **Hooks** | ✅ `useProductDatabase`, `useProductSync` | ✅ Refactorizado |
| **Tests** | ✅ 40+ tests | ✅ Mantener |
| **Issues** | ❌ Dynamic imports conflict | ✅ Resolver |

**Acciones:**
1. Mover `ProductCard` y `ProductStatsBar` a `modules/inventory/components/`
2. Consolidar hooks en `hooks/index.ts`
3. Resolver dynamic import conflicts

---

### Módulo: Sync (Sincronización)

| Aspecto | Estado Actual | Target |
|---------|--------------|--------|
| **Architecture** | ✅ FSM integrada | ✅ `services/sync/fsm/` |
| **Components** | ✅ `SyncQueuePanel`, `SyncActivity` | ✅ Unificados |
| **Engine** | ✅ `GenericSyncEngine` | ✅ Mantener |
| **Tests** | ✅ 12 tests | ✅ Expandir |
| **Issues** | ⚠️ 103 dynamic import conflicts | ✅ Resolver |

**Acciones:**
1. Documentar `GenericSyncEngine` API
2. Agregar tests para `pushIncremental`, `pullChanges`
3. Resolver dynamic imports (bajo prioridad)

---

## Componentes Compartidos (Shared)

### Primitivos UI (Pendientes)

| Componente | Estado | Prioridad | Notas |
|------------|--------|-----------|-------|
| `Button` | ❌ No existe | 🔴 Alta | Usar `<button>` de HTML |
| `Input` | ❌ No existe | 🔴 Alta | Unificar inputs |
| `Badge` | ⚠️ En theme | 🔴 Alta | Mover a `ui/Badge` |
| `Card` | ⚠️ Mixto | 🟡 Media | Consolidar |
| `Modal` | ⚠️ Múltiples | 🔴 Alta | Usar `<dialog>` |
| `Tooltip` | ❌ No existe | 🟡 Media | Agregar |

### Componentes Layout (Existentes ✅)

| Componente | Ubicación | Estado |
|------------|-----------|--------|
| `DualView` | `shared/components/layout/` | ✅ Completado |
| `DetailPanel` | `shared/components/layout/` | ✅ Completado |
| `Section/Row` | `shared/components/layout/` | ✅ Completado |
| `Splitter` | `shared/components/layout/` | ✅ Completado |

### Componentes Data (Parcial)

| Componente | Estado | Prioridad |
|------------|--------|-----------|
| `VirtualList` | ✅ Existe | 🔴 Alta |
| `DataTable` | ⚠️ En uso disperso | 🟡 Media |
| `Pagination` | ❌ No existe | 🟡 Media |

---

## Hooks Globales a Refactorizar

### Hooks que Deben Quedar Globales
- `useAppInit` - Inicialización de app
- `useAutoSync` - Sincronización background
- `useNetworkStatus` - Estado de red
- `useTheme` - Tema global

### Hooks que Deben Migrar a Módulos
| Hook Actual | Destino |
|-------------|---------|
| `useAudit` | `modules/sync/` |
| `useBulkActions` | `modules/shared/` |
| `useBulkActionsAdvanced` | `modules/shared/` |
| `useConflictResolution` | `infrastructure/sync/` |
| `useExpiryWatcher` | `modules/expiry/` |
| `useGenericSync` | `infrastructure/sync/` |
| `useGlobalSearch` | `app/providers/` |
| `useHIDScanner` | `shared/scanner/` |

---

## Services a Consolidar

### Services de Infraestructura ✅
- `logger.ts` - Centralizado
- `analyticsService.ts` - Consolidado
- `audio.ts` - Módulo de audio

### Services a Refactorizar

| Service | Problema | Acción |
|---------|----------|--------|
| `syncManager.ts` | 495 líneas | ✅ Reducido a 37 líneas |
| `supabaseSyncService.ts` | Wrapper deprecated | Mantener (30+ deps) |
| `batchUploader.ts` | Mezclado | Extraer `BatchService` |
| `export.ts` | 300+ líneas | Dividir en `csv.ts`, `pdf.ts`, `excel.ts` |

---

## Tipos (Types)

### Estructura Actual
```
src/types/
├── global/
│   ├── sync.ts        # Tipos de sync
│   └── ...
├── index.ts
└── types.ts
```

### Estructura Objetivo
```
src/modules/{module}/types/          # Tipos específicos del módulo
src/shared/types/                   # Tipos compartidos
src/infrastructure/types/           # Tipos de DB, API
src/types/                         # Re-exports globales
```

---

## Plan de Ejecución por Fases

### Fase 0: Fundamentos (1-2 días) ✅
- [x] Repository Pattern (completado)
- [x] FSM Sync (completado)
- [x] Domain modules (completado)
- [x] Shared components (DualView, DetailPanel)

### Fase 1: Componentes UI Compartidos (3-5 días) ✅
- [x] `shared/ui/` ya existe con primitivos:
  - [x] `Button` (variants: primary, secondary, danger, ghost, outline)
  - [x] `Input` (con label, error, helperText)
  - [x] `Badge` (variants: success, warning, error, info, muted)
  - [x] `Card` (base para todos los cards)
  - [x] `Modal` (usando `<dialog>`)
  - [x] `Spinner`, `Skeleton`, `VirtualList`
- [ ] Mejorar: Migrar de Tailwind puro a tokens CSS del tema AppSheet

### Fase 2: Refactorizar Módulos (5-7 días)

#### Counting Module ✅ (COMPLETADO 2026-06-23)
**Estado:** Domain creado + arquitectura Lego

**Estructura actual:**
```
counting/
├── CountingPage.tsx          # ✅ 201 líneas (OK)
├── components/               # ✅ (ya existe)
│   ├── CountingCameraView.tsx
│   ├── CountingKanbanView.tsx
│   ├── CountingMetricsCards.tsx
│   └── ...
├── hooks/                    # ✅ Refactorizado
│   ├── index.ts             # ✅ Exports centralizados
│   ├── useCountingLogic.ts   # ✅ Composición
│   ├── useCountingAI.ts      # ✅
│   ├── useCountingQueries.ts # ✅
│   ├── useCountingSync.ts   # ✅
│   ├── useProductivity.ts   # ✅ (9 tests)
│   └── useTurboMode.ts      # ✅ (9 tests)
└── domain/                   # ✅ CREADO
    ├── index.ts             # ✅ Exports
    ├── countingDomain.ts    # ✅ Lógica pura (37 tests)
    └── countingDomain.test.ts
```

**Implementado:**
1. [x] Crear `domain/countingDomain.ts` con:
   - Evaluación de productos (isPharmaBarcode, evaluateProduct)
   - Normalización de barcode (findItemByBarcode, isSameProduct)
   - Lógica de evaluación (shouldPromptBatch)
   - Métricas (calculateCountingMetrics, calculateProgress)
   - Validación (isValidBarcode, isValidQuantity, isValidExpiryDate)
   - Formateo (formatBarcode, getCountingSummary)
2. [x] Tests: 37 tests para countingDomain
3. [x] Exports centralizados en `hooks/index.ts` y `domain/index.ts`

#### Inventory Module ✅ (COMPLETADO 2026-06-23)
**Estado:** Exports centralizados

**Estructura actual:**
```
inventory/
├── domain/                   # ✅ EXISTS
│   ├── index.ts             # ✅ EXPORTS CREADOS
│   ├── productsDomain.ts     # ✅ (34 tests)
│   └── productsDomain.test.ts
├── hooks/                    # ✅ EXISTS
│   ├── index.ts             # ✅ EXPORTS CREADOS
│   ├── useProductDatabase.ts
│   ├── useProductForm.ts
│   ├── useProductQuery.ts
│   ├── useProductSync.ts
│   ├── useProductsStats.ts  # ✅ (6 tests)
│   └── ...
├── components/              # ✅ EXISTS
│   ├── index.ts             # ✅ EXPORTS CREADOS
│   ├── ProductCard.tsx
│   ├── ProductStatsBar.tsx
│   └── ...
└── InventoryPage.tsx        # ✅ Refactorizado
```

**Implementado:**
1. [x] Exports centralizados en `domain/index.ts`
2. [x] Exports centralizados en `hooks/index.ts`
3. [x] Exports centralizados en `components/index.ts`

#### Events Module ✅ (COMPLETADO 2026-06-23)
**Estado:** Arquitectura v2 implementada + exports centralizados

**Estructura actual:**
```
events/
├── domain/                   # ✅ EXISTS
│   ├── eventsDomain.ts       # ✅
│   ├── eventsDomain.test.ts  # ✅ (26 tests)
│   └── index.ts             # ✅ EXPORTS CREADOS
├── hooks/                    # ✅ EXISTS
│   ├── index.ts             # ✅ (ya existía)
│   └── ...
├── components/               # ✅ EXISTS
│   ├── index.ts             # ✅ (ya existía)
│   └── ...
└── EventsPage.tsx
```

#### Expiry Module ✅ (COMPLETADO 2026-06-23)
**Estado:** Arquitectura v2 implementada + exports centralizados

**Estructura actual:**
```
expiry/
├── domain/                   # ✅ EXISTS
│   ├── expiryDomain.ts
│   ├── expiryDomain.test.ts  # ✅ (27 tests)
│   ├── expiryEngine.ts
│   └── index.ts             # ✅ EXPORTS CREADOS
├── hooks/                    # ✅ EXISTS
│   ├── useExpiry.ts
│   └── index.ts             # ✅ EXPORTS CREADOS
├── components/              # ✅ EXISTS
│   ├── ExpiryItemCard.tsx
│   ├── ExpiryStatsBar.tsx
│   ├── ExpiryDetailModal.tsx
│   ├── ExpiryCaptureModal.tsx
│   ├── ExpirationModal.tsx
│   └── index.ts             # ✅ EXPORTS CREADOS
└── ExpiryPage.tsx
```

### Módulos Pendientes de Consolidar

| Módulo | Estructura | Prioridad |
|--------|------------|-----------|
| **Suppliers** | components, hooks, pages | 🟡 Media |
| **Customers** | Components simples | 🟢 Baja |
| **Slices** | domain, hooks, types | 🟡 Media |
| **Reports** | hooks, components | 🟡 Media |
| **Reception** | hooks, types | 🟡 Media |

### Fase 3: Hooks Globales (2-3 días)
- [ ] Migrar hooks a módulos correspondientes
- [ ] Crear `shared/hooks/` para hooks reutilizables:
  - `useDebounce`
  - `useLocalStorage`
  - `useMediaQuery`
  - `useClickOutside`
  - `useKeyboardShortcut`

### Fase 4: Services (2-3 días)
- [ ] Dividir `export.ts` en servicios específicos
- [ ] Documentar API de `GenericSyncEngine`
- [ ] Consolidar servicios de validación

### Fase 5: Performance (2-3 días)
- [ ] Implementar `React.memo` en componentes pesados
- [ ] Agregar `useMemo`/`useCallback` donde sea necesario
- [ ] Virtualizar listas con >100 items
- [ ] Lazy load imágenes con `IntersectionObserver`

### Fase 6: Testing (Continuo)
- [ ] Alcanzar 60% coverage
- [ ] Tests de integración para módulos críticos
- [ ] E2E tests para flujos principales

---

## Métricas de Éxito

| Métrica | Actual | Target |
|---------|--------|--------|
| Tests | 354 | 500+ |
| Coverage | ~40% | 60%+ |
| Bundle size | 4.4 MB | <4 MB |
| LCP | ? | <2.5s |
| Module cohesion | Mezclado | Arquitectura Lego |

---

## Componentes Referencia

### Arquitectura de Módulo Ejemplar

```
modules/expiry/                    # ✅ PATRÓN A SEGUIR
├── ExpiryPage.tsx               # Página principal (delegación)
├── domain/
│   ├── expiryDomain.ts           # Lógica pura
│   └── expiryDomain.test.ts     # Tests de dominio
├── hooks/
│   ├── index.ts                 # Exports centralizados
│   ├── useExpiry.ts             # Hook principal
│   └── useExpiryStats.ts       # Hook específico
├── components/
│   ├── ExpiryCard.tsx           # Card individual
│   ├── ExpiryStatsBar.tsx       # Barra de stats
│   ├── ExpiryDetailModal.tsx    # Modal de detalle
│   └── ExpiryCaptureModal.tsx   # Modal de captura
└── types/
    └── expiry.ts               # Tipos del módulo
```

### Arquitectura de Módulo por Refactorizar

```
modules/counting/                 # ❌ REQUIERE REFACTOR
├── CountingPage.tsx              # 490 líneas (mucho!)
├── hooks/
│   ├── useCounting.ts           # Mezclado
│   ├── useProductivity.ts       # ✅ Bien
│   └── useTurboMode.ts          # ✅ Bien
├── components/                   # ❌ No existe
│   └── ...
└── domain/                      # ❌ No existe
    └── countingDomain.ts
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper funcionalidad existente | Alta | Alto | Tests antes/después |
| Dynamic imports conflicts | Media | Medio | Resolver incrementally |
| Bundle size increase | Baja | Medio | Tree shaking |
| Dependencias circulares | Media | Alto | ESLint rules |

---

## Definición de "Done"

Un módulo está refactorizado cuando:
1. ✅ Tiene estructura `domain/hooks/components/types/`
2. ✅ Domain tiene tests (>80% coverage)
3. ✅ Componentes están en `components/`
4. ✅ Exports centralizados en `index.ts`
5. ✅ No tiene `console.log`
6. ✅ Pasa todos los tests
7. ✅ Build pasa sin warnings críticos

---

## Próximos Pasos Inmediatos

1. **Crear `shared/ui/`** con componentes primitivos
2. **Refactorizar Counting** siguiendo patrón Expiry
3. **Migrar hooks globales** a módulos correspondientes
4. **Agregar tests** para módulos sin cobertura

---

*Documento generado: 2026-06-23*
*Versión: 1.0*
*Estado: Draft - Pendiente revisión*
