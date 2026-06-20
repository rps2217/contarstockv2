# 🎯 PLAN DE ACCIÓN COMPLETO - ContarStock v2.....----------xxxx

**Fecha Creación:** 2026-06-17  
**Última Actualización:** 2026-06-18
**Versión:** 2.0  
**Estado:** Post-FASE 10-16 completado ✅

---

## ✅ COMPLETADO (2026-06-17)

### FASE 0-9: Refactorización Mayor

- [x] SlicesPage, ReportsPage, SyncCenterPage refactorizados
- [x] CreateEventModal, SupabaseAuditorModal extraídos
- [x] TypeScript types centralizados en src/types/global/
- [x] Hooks divididos: useEventQueries, useEventMutations, useEventFilters
- [x] Logger centralizado con niveles
- [x] SyncFacade creado
- [x] PreferencesService implementado

### FASE 10-16: Cleanup (2026-06-18)

- [x] FASE-10: Cleanup Settings module
- [x] FASE-11: Deep cleanup Settings
- [x] FASE-12: Clean up Inventory module
- [x] FASE-13: Remove SoundFX from Expiry
- [x] FASE-14: Session module cleanup
- [x] FASE-15: Remove SoundFX from Events
- [x] FASE-16: Clean up imports and document root modules
- [x] PR #8 mergeado a main

---

## 🔴 PENDIENTE - CI FAILING

**Fecha:** 2026-06-18  
**PR:** #8 fusionado pero CI checks fallan

```
Problema: npm ci falla en GitHub Actions
Error: package-lock.json desincronizado

Solución:
  1. git checkout main
  2. rm package-lock.json
  3. npm install --legacy-peer-deps
  4. git add package-lock.json
  5. git commit -m "fix: Regenerate lock file"
  6. git push origin main
```

**Comando rápido:**

```bash
git checkout main && rm package-lock.json && npm install --legacy-peer-deps && git add package-lock.json && git commit -m "fix: Regenerate lock file for CI" && git push origin main
```

---

## 🟡 PRÓXIMOS PASOS RECOMENDADOS

### 1. Fix CI (CRÍTICO)

```bash
git checkout main && rm package-lock.json && npm install --legacy-peer-deps && git add package-lock.json && git commit -m "fix: Regenerate lock file for CI" && git push origin main
```

### 2. Coverage Improvement (MEDIA)

- **Objetivo:** >60% coverage (actual ~30%)
- **Prioridad archivos:**
  - `src/services/supabaseSyncService.ts` (3.84% coverage)
  - `src/services/validation.ts` (46% coverage)
  - `src/services/export.ts` (29% coverage)

### 3. ESLint/Prettier Setup (MEDIA)

- Agregar `.eslintrc.json` y `.prettierrc`
- Configurar pre-commit hooks

### 4. Performance Audit (BAJA)

- Analizar bundle size
- Considerar code-splitting

### 5. Documentación (BAJA)

- README actualizado
- Architecture guide

---

## 🎯 MÉTRICAS OBJETIVO

| Métrica           | Actual  | Meta    |
| ----------------- | ------- | ------- |
| CI Status         | ❌ FAIL | ✅ PASS |
| Test Coverage     | ~30%    | >60%    |
| TypeScript Errors | 0       | 0       |
| ESLint Errors     | N/A     | 0       |

---

## 📝 NOTAS PARA CONTINUAR

### Mañana desde otro dispositivo:

```bash
# 1. Clonar repositorio
git clone https://github.com/rps2217/contarstockv2.git
cd contarstockv2

# 2. Instalar dependencias
npm install

# 3. Regenerar lock si CI falla
rm package-lock.json && npm install --legacy-peer-deps

# 4. Ver estado
npm run test:run  # Debe pasar 151 tests
npm run lint      # Debe ser 0 errores TS
```

### Para crear PR con mejoras:

```bash
git checkout -b feature/improve-coverage
# hacer cambios
git push origin feature/improve-coverage
gh pr create --title "test: Improve test coverage" --body "..."
```

---

_Última actualización: 2026-06-18 04:59 UTC_  
_Creado por: OpenHands AI Agent_

## 📊 RESUMEN DE PROBLEMAS

| Severidad     | Cantidad | Líneas Afectadas |
| ------------- | -------- | ---------------- |
| 🔴 CRÍTICO    | 3        | ~1,968           |
| 🟡 IMPORTANTE | 7        | ~2,200           |
| 🟢 MEDIO      | 5        | ~800             |
| 🔵 MENOR      | 4        | ~300             |

---

## 🔴 FASE 1: CRÍTICO - Componentes que Violan Arquitectura

### Regla AGENTS.md:

> "Do NOT merge components; split them when they exceed 150-200 lines if feasible"

### 1.1 SlicesPage.tsx (826 líneas → 200 líneas)

**Archivo actual:** `src/features/slices/SlicesPage.tsx`

**Componentes a extraer:**

```
src/features/slices/
├── SlicesPage.tsx                    [826 líneas] → [150 líneas]
├── components/
│   ├── SliceList.tsx                 [150 líneas] - Lista de slices
│   ├── SliceEditor.tsx               [200 líneas] - Modal de edición
│   ├── SliceFilters.tsx              [100 líneas] - Filtros de tabla
│   ├── SlicePreview.tsx              [150 líneas] - Vista previa de datos
│   └── SystemSlicesBadge.tsx         [50 líneas]  - Badges de sistema
├── constants/
│   └── defaultSlices.ts              [60 líneas]  - DEFAULT_SLICES
└── types/
    └── Slice.ts                      [30 líneas]  - Interfaces
```

**Cambios específicos:**

- [ ] Mover `DEFAULT_SLICES` a `constants/defaultSlices.ts`
- [ ] Mover `AppSheetSlice` interface a `types/Slice.ts`
- [ ] Crear `SliceList.tsx` - Extraer lógica de renderizado de lista
- [ ] Crear `SliceEditor.tsx` - Extraer modal de crear/editar slice
- [ ] Crear `SliceFilters.tsx` - Extraer panel de filtros
- [ ] Crear `SlicePreview.tsx` - Extraer vista previa con tabla de datos
- [ ] Simplificar `SlicesPage.tsx` a orchestration puro

---

### 1.2 ReportsPage.tsx (458 líneas → 200 líneas)

**Archivo actual:** `src/features/reports/ReportsPage.tsx`

**Componentes a extraer:**

```
src/features/reports/
├── ReportsPage.tsx                   [458 líneas] → [180 líneas]
├── components/
│   ├── ReportsHeader.tsx              [80 líneas]  - Header con stats
│   ├── LiveConsolidationGrid.tsx     [200 líneas] - Grid consolidado
│   ├── SessionHistoryList.tsx         [180 líneas] - Lista de sesiones
│   ├── ReportsFilters.tsx            [100 líneas] - Pills de filtro
│   └── LiveStatsCards.tsx            [80 líneas]  - Tarjetas de métricas
├── hooks/
│   └── useReportsExport.ts           [60 líneas]  - Lógica de exportación
└── types/
    └── Report.ts                     [20 líneas]
```

**Cambios específicos:**

- [ ] Extraer `ReportsHeader` a su propio componente
- [ ] Extraer grid de consolidación a `LiveConsolidationGrid.tsx`
- [ ] Extraer lista de sesiones a `SessionHistoryList.tsx`
- [ ] Extraer `handleExportLiveToExcel` a `useReportsExport.ts`
- [ ] Mover types a `types/Report.ts`

---

### 1.3 SyncCenterPage.tsx (684 líneas → 200 líneas)

**Archivo actual:** `src/features/sync/SyncCenterPage.tsx`

**Componentes a extraer:**

```
src/features/sync/
├── SyncCenterPage.tsx                [684 líneas] → [180 líneas]
├── components/
│   ├── SyncGroupsList.tsx            [200 líneas] - Lista de grupos pendientes
│   ├── SyncStatusCard.tsx            [120 líneas] - Card de estado
│   ├── SyncActions.tsx               [100 líneas] - Botones de acción
│   ├── ConflictResolver.tsx           [150 líneas] - Resolvedor de conflictos
│   └── SyncHistory.tsx               [120 líneas] - Historial de sincronizaciones
├── hooks/
│   └── useSyncCenter.ts              [80 líneas]  - Lógica principal
└── types/
    └── Sync.ts                      [40 líneas]
```

---

### 1.4 CreateEventModal.tsx (609 líneas → 200 líneas)

**Archivo actual:** `src/features/events/components/CreateEventModal.tsx`

**Componentes a extraer:**

```
src/features/events/components/
├── CreateEventModal.tsx              [609 líneas] → [180 líneas]
├── EventForm.tsx                    [250 líneas] - Formulario principal
├── EventTypeSelector.tsx            [100 líneas] - Selector de tipo
├── EventPreview.tsx                 [120 líneas] - Vista previa
└── EventValidation.tsx              [80 líneas]  - Validación
```

---

### 1.5 SupabaseAuditorModal.tsx (467 líneas → 180 líneas)

**Archivo actual:** `src/features/settings/components/SupabaseAuditorModal.tsx`

**Componentes a extraer:**

```
src/features/settings/components/
├── SupabaseAuditorModal.tsx         [467 líneas] → [150 líneas]
├── AuditTable.tsx                   [200 líneas] - Tabla de auditoría
├── AuditFilters.tsx                 [80 líneas]  - Filtros
└── AuditExport.tsx                  [60 líneas]  - Exportar logs
```

---

## 🔴 FASE 2: CRÍTICO - Eliminar Uso Excesivo de `any`

### 2.1 Análisis de los 555 `any`

**Distribución:**

```
useSyncStore.ts              1 any     (Línea ~17 - onConflict)
mainAppStore.ts             3 any     (Líneas ~10, 17, 18 - set/update)
SyncCenterPage.tsx         ~15 any   (handlers, callbacks)
useReports.ts               ~25 any   (API responses, data transforms)
export.ts (antes)           ~12 any   (workbook, worksheet, data)
Total crítico               ~56 any   (deben arreglarse primero)
```

### 2.2 Plan de Tipado

**Crear archivo de tipos globales:**

```
src/types/
├── api.ts                  - Tipos para respuestas de API
├── sync.ts                 - Tipos de sincronización
├── export.ts               - Tipos para exportación
└── forms.ts                - Tipos para formularios
```

**Ejemplos de cambios:**

```typescript
// ANTES (mainAppStore.ts:10)
updateSetting: (key: keyof AppSettings, value: any) => void;

// DESPUÉS
updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
```

```typescript
// ANTES (useReports.ts)
const config = (await import(...)).getSettings().cloudConfig; // any

// DESPUÉS
import { CloudConfig } from '../../types/api';
const config: CloudConfig = getSettings().cloudConfig;
```

### 2.3 Cambios Específicos

**Prioridad 1 - Interfaces Críticas (56 any):**

- [ ] `mainAppStore.ts` - Tipar `set` y `updateSetting`
- [ ] `useSyncStore.ts` - Tipar callbacks
- [ ] `export.ts` - Tipar `workbook`, `worksheet`, `data`
- [ ] `useReports.ts` - Tipar respuestas de Supabase

**Prioridad 2 - Hooks y Services (~200 any):**

- [ ] Tipar todos los `useCallback` con tipos explícitos
- [ ] Tipar respuestas de `supabase.*` queries
- [ ] Tipar `db.*` operaciones de Dexie

**Prioridad 3 - Componentes (~300 any):**

- [ ] Tipar `onClick`, `onChange` handlers
- [ ] Tipar `e: any` en event handlers → `e: React.ChangeEvent<HTMLInputElement>`

---

## 🟡 FASE 3: IMPORTANTE - Hooks Gigantes

### 3.1 useEventDatabase.ts (554 líneas)

**Hook actual:** `src/features/events/hooks/useEventDatabase.ts`

**División propuesta:**

```
src/features/events/hooks/
├── useEventDatabase.ts               [554 líneas] → [150 líneas] (ORCHESTRATION)
├── useEventQueries.ts                [200 líneas] - Queries y useLiveQuery
├── useEventMutations.ts              [180 líneas] - Create, Update, Delete
├── useEventSync.ts                  [150 líneas] - Sincronización con nube
└── useEventFilters.ts               [80 líneas]  - Filtrado y búsqueda
```

**Cambios específicos:**

- [ ] Extraer `getEventStats()` a `useEventQueries.ts`
- [ ] Extraer `createEvent()`, `updateEvent()`, `deleteEvent()` a `useEventMutations.ts`
- [ ] Extraer lógica de sync a `useEventSync.ts`
- [ ] Mantener `useEventDatabase.ts` como composición de sub-hooks

---

### 3.2 useExpectedOrders.ts (383 líneas)

**División propuesta:**

```
src/features/expected-orders/hooks/
├── useExpectedOrders.ts              [383 líneas] → [150 líneas]
├── useOrderQueries.ts                [150 líneas]
├── useOrderImport.ts                [180 líneas]
└── useOrderValidation.ts            [80 líneas]
```

---

### 3.3 useReports.ts (373 líneas)

**División propuesta:**

```
src/features/reports/hooks/
├── useReports.ts                    [373 líneas] → [150 líneas]
├── useReportQueries.ts              [200 líneas]
├── useReportSync.ts                 [150 líneas]
└── useReportExport.ts               [80 líneas]
```

---

### 3.4 useHammerLogic.ts (314 líneas)

**División propuesta:**

```
src/features/hammer/hooks/
├── useHammerLogic.ts                [314 líneas] → [150 líneas]
├── useHammerScan.ts                 [180 líneas] - Procesamiento de scans
├── useHammerSync.ts                 [120 líneas] - Sync a nube
└── useHammerBatch.ts                [100 líneas] - Gestión de batch
```

---

### 3.5 useReceptionLogic.ts (172 líneas) - YA RAZONABLE

Este hook está dentro del límite de 200 líneas, solo agregar JSDoc y tipos.

---

## 🟡 FASE 4: IMPORTANTE - Servicios Muy Grandes

### 4.1 syncManager.ts (489 líneas)

**División propuesta:**

```
src/services/
├── syncManager.ts                    [489 líneas] → [150 líneas]
├── sync/
│   ├── UploadGroupBuilder.ts         [150 líneas] - Construir grupos
│   ├── BatchUploader.ts             [200 líneas] - Upload batch
│   ├── Reconciliation.ts            [100 líneas] - Reconciliación
│   └── types.ts                     [50 líneas]  - Tipos de sync
└── index.ts                         [20 líneas]  - Re-export
```

---

### 4.2 supabaseSyncService.ts (466 líneas)

**División propuesta:**

```
src/services/
├── supabaseSyncService.ts            [466 líneas] → [150 líneas]
├── supabase/
│   ├── Client.ts                    [80 líneas]  - Cliente Supabase
│   ├── Queries.ts                   [150 líneas] - Consultas
│   ├── Mutations.ts                 [150 líneas] - Mutaciones
│   └── types.ts                     [60 líneas]
└── index.ts
```

---

### 4.3 dynamicSync.ts (363 líneas)

**División propuesta:**

```
src/services/
├── dynamicSync.ts                    [363 líneas] → [150 líneas]
├── dynamic/
│   ├── SyncEngine.ts                [180 líneas]
│   ├── TableSync.ts                 [120 líneas]
│   └── types.ts                     [50 líneas]
```

---

### 4.4 syncRegistry.ts (372 líneas)

**División propuesta:**

```
src/services/cloud/
├── syncRegistry.ts                   [372 líneas] → [150 líneas]
├── registry/
│   ├── RegistryBuilder.ts           [150 líneas]
│   ├── TableRegistry.ts             [100 líneas]
│   └── FieldMapper.ts               [80 líneas]
```

---

### 4.5 GenericSyncEngine.ts (242 líneas)

**YA RAZONABLE** - Solo agregar JSDoc y tipos.

---

## 🟡 FASE 5: IMPORTANTE - Unificar Persistencia

### 5.1 Problema Actual

```
┌──────────────────────────────────────────────┐
│  current state: 3 ZUSTAND STORES + 5+ localStorage keys  │
├──────────────────────────────────────────────┤
│  Zustand Stores:                             │
│  ├── mainAppStore.ts    (NO PERSISTE)        │
│  ├── useSyncStore.ts    (PERSISTE)          │
│  └── useToastStore.ts   (NO PERSISTE)       │
├──────────────────────────────────────────────┤
│  localStorage directo:                       │
│  ├── 'logicount_settings'                   │
│  ├── 'logicount_appsheet_slices'            │
│  ├── 'event_preferences'                    │
│  ├── 'logicount_operator_id'               │
│  ├── 'logicount_auth'                       │
│  └── 'last_sync_*'                          │
└──────────────────────────────────────────────┘
```

### 5.2 Plan de Unificación

**Paso 1: Crear PreferencesService centralizado**

```typescript
// src/services/PreferencesService.ts
export class PreferencesService {
  private static KEYS = {
    SETTINGS: 'logicount_settings',
    SLICES: 'logicount_appsheet_slices',
    EVENT_PREFS: 'event_preferences',
    OPERATOR: 'logicount_operator_id',
    AUTH: 'logicount_auth',
  };

  static get<T>(key: keyof typeof KEYS, defaultValue: T): T { ... }
  static set<T>(key: keyof typeof KEYS, value: T): void { ... }
  static remove(key: keyof typeof KEYS): void { ... }
}
```

**Paso 2: Migrar mainAppStore a Zustand persist**

```typescript
// src/store/mainAppStore.ts
export const useAppStore = create<SettingsSlice & UISlice>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'logicount_settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Paso 3: Reemplazar usos directos de localStorage**

- [ ] `SlicesPage.tsx` → usar PreferencesService
- [ ] `useEventDatabase.ts` → usar PreferencesService
- [ ] `useDashboard.ts` → usar PreferencesService

**Paso 4: Limpiar claves huérfanas**

```typescript
// src/services/MigrationService.ts
export class MigrationService {
  static cleanup(): void {
    // Limpiar claves antiguas no usadas
    const oldKeys = ["logicount_old_key_1", "temp_sync_data"];
    oldKeys.forEach((key) => localStorage.removeItem(key));
  }
}
```

---

## 🟢 FASE 6: MEDIO - Consolidar Lógica de Sincronización

### 6.1 Problema: syncToCloud() en 4+ lugares

```typescript
// useHammerLogic.ts - SyncScansToCloud(batchId)
// useReceptionLogic.ts - syncManager.performBatchUpload(group)
// useExpirySync.ts - Sync a tabla expiry
// useEventDatabase.ts - Sync a tabla events
```

### 6.2 Crear SyncFacade

```typescript
// src/services/sync/SyncFacade.ts
export class SyncFacade {
  static async syncHammer(batchId: string): Promise<SyncResult>;
  static async syncReception(sessionId: string): Promise<SyncResult>;
  static async syncExpiry(): Promise<SyncResult>;
  static async syncEvents(): Promise<SyncResult>;
  static async syncAll(): Promise<SyncSummary>;
}
```

### 6.3 Cambios específicos

- [ ] Crear `SyncFacade` en `src/services/sync/`
- [ ] Refactorizar `useHammerLogic.syncToCloud()` para usar SyncFacade
- [ ] Refactorizar `useReceptionLogic.syncToCloud()` para usar SyncFacade
- [ ] Refactorizar `useExpirySync` para usar SyncFacade
- [ ] Refactorizar `useEventSync` para usar SyncFacade
- [ ] Eliminar código duplicado en cada hook

---

## 🟢 FASE 7: MEDIO - Crear Servicios Centrales

### 7.1 Logger Centralizado

**Crear:** `src/services/logger.ts` (MEJORAR)

```typescript
// src/services/logger.ts
export enum LogLevel { DEBUG, INFO, WARN, ERROR }
export const logger = {
  debug: (context: string, message: string, data?: any) => { ... },
  info: (context: string, message: string, data?: any) => { ... },
  warn: (context: string, message: string, data?: any) => { ... },
  error: (context: string, message: string, data?: any) => { ... },
};
```

**Reemplazar:**

- [ ] `console.error()` → `logger.error()`
- [ ] `console.warn()` → `logger.warn()`
- [ ] `console.log()` → `logger.debug()` o `logger.info()`

### 7.2 Export Service (MEJORAR)

**Ya existe:** `src/services/export.ts` (refactorizado en PR#3)

**Mejoras pendientes:**

- [ ] Unificar `exportHammerToExcel` y `exportToExcel` usando helper
- [ ] Crear `exportLiveConsolidation()` para ReportsPage
- [ ] Mover helper a función exportable

### 7.3 Validation Service

**Crear:** `src/services/validation.ts`

```typescript
export class ValidationService {
  static isValidBarcode(barcode: string): boolean;
  static isValidQuantity(qty: number): boolean;
  static isValidDate(date: string): boolean;
  static isValidLocation(loc: string): boolean;
  static validateSession(session: CountingSession): ValidationResult;
}
```

---

## 🟢 FASE 8: MEDIO - Limpiar Código Muerto

### 8.1 TODOs Sin Implementar

```typescript
// src/features/slices/SlicesPage.tsx:143-150
// TODO: Refrescar al abrir slice - Sin implementar
// ACTION: Implementar useEffect para refresh
```

```typescript
// src/features/reports/ReportsPage.tsx - scroll infinito
// TODO: Implementar paginación real con cursor
```

### 8.2 Código Redundante

```typescript
// useExpiryWatcher.ts:45
const settings = getSettings(); // Línea 45
// ... 100 líneas ...
const settings = getSettings(); // Línea 145 - DUPLICADO
// ACTION: Guardar en variable y reutilizar
```

### 8.3 Imports No Usados

```bash
# Run para encontrar
grep -rn "import.*from" src --include="*.ts" --include="*.tsx" | sort | uniq -c | sort -rn | head -20
```

**Limpieza:**

- [ ] Remover imports no utilizados
- [ ] Remover variables declaradas sin usar
- [ ] Remover funciones exportadas sin usar

---

## 🔵 FASE 9: MENOR - Estandarizar Naming

### 9.1 Variables de Identificación

| Actual      | Propuesto                | Ubicación      |
| ----------- | ------------------------ | -------------- |
| `erpOrder`  | `orderId` o `erpOrderId` | Consistente    |
| `batchId`   | `batchId`                | Consistente ✓  |
| `sessionId` | `sessionId`              | Consistente ✓  |
| `groupId`   | `uploadGroupId`          | En syncManager |

### 9.2 Estados de Sincronización

| Actual             | Propuesto                   |
| ------------------ | --------------------------- |
| `'pending'`        | `SyncStatus.PENDING`        |
| `'synced'`         | `SyncStatus.SYNCED`         |
| `'error'`          | `SyncStatus.ERROR`          |
| `'pending_delete'` | `SyncStatus.PENDING_DELETE` |

**Crear:**

```typescript
// src/types/sync.ts
export enum SyncStatus {
  PENDING = "pending",
  SYNCED = "synced",
  ERROR = "error",
  PENDING_DELETE = "pending_delete",
}
```

### 9.3 Acciones de Sincronización

| Actual                 | Propuesto                     |
| ---------------------- | ----------------------------- |
| `syncToCloud()`        | `syncToCloud()` ✓ Consistente |
| `pushScansToCloud()`   | `pushScans()`                 |
| `performBatchUpload()` | `uploadBatch()`               |
| `reconcileReception()` | `reconcile()` ✓               |

---

## 🔵 FASE 10: MENOR - Agregar Testing

### 10.1 Configurar Vitest

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

### 10.2 Tests a Crear

```typescript
// src/services/export.test.ts (YA CREADO en PR#3)
// src/services/aggregator.test.ts
// src/services/validation.test.ts
// src/hooks/useHammerLogic.test.ts
```

### 10.3 Coverage Target

| Fase               | Coverage |
| ------------------ | -------- |
| Servicios críticos | 80%      |
| Hooks              | 60%      |
| Componentes UI     | 40%      |

---

## 📋 ORDEN DE EJECUCIÓN SUGERIDO

```
┌─────────────────────────────────────────────────────────────┐
│  ORDEN DE IMPLEMENTACIÓN                                    │
├─────────────────────────────────────────────────────────────┤
│  1. FASE 5: Persistencia (Foundation)                      │
│     - Crear PreferencesService                              │
│     - Migrar mainAppStore a persist                         │
│                                                             │
│  2. FASE 1: Componentes (UI)                                │
│     - SlicesPage → ~5 componentes                           │
│     - ReportsPage → ~4 componentes                          │
│     - SyncCenterPage → ~5 componentes                       │
│                                                             │
│  3. FASE 2: TypeScript (Safety)                             │
│     - Eliminar 555+ any                                    │
│     - Tipar interfaces críticas                             │
│                                                             │
│  4. FASE 3: Hooks (Logic)                                   │
│     - useEventDatabase → 5 hooks                           │
│     - useExpectedOrders → 4 hooks                          │
│                                                             │
│  5. FASE 4: Services (Backend)                              │
│     - syncManager → 4 módulos                               │
│     - supabaseSyncService → 4 módulos                      │
│                                                             │
│  6. FASE 6: Sync Facade (Unification)                      │
│     - Crear SyncFacade                                      │
│     - Refactorizar todos los hooks                          │
│                                                             │
│  7. FASE 7: Servicios Centrales                             │
│     - Logger, Validation, etc.                              │
│                                                             │
│  8. FASE 8: Cleanup                                        │
│     - Código muerto, TODOs                                  │
│                                                             │
│  9. FASE 9: Naming                                         │
│     - Enums, constantes                                     │
│                                                             │
│  10. FASE 10: Testing                                      │
│      - Vitest + coverage                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 TIEMPO ESTIMADO

| Fase                 | Complejidad | Estimado        |
| -------------------- | ----------- | --------------- |
| FASE 1: Componentes  | Alta        | 8-10 horas      |
| FASE 2: TypeScript   | Media       | 4-6 horas       |
| FASE 3: Hooks        | Alta        | 6-8 horas       |
| FASE 4: Services     | Alta        | 6-8 horas       |
| FASE 5: Persistencia | Media       | 3-4 horas       |
| FASE 6: Sync Facade  | Alta        | 4-6 horas       |
| FASE 7: Servicios    | Baja        | 2-3 horas       |
| FASE 8: Cleanup      | Baja        | 1-2 horas       |
| FASE 9: Naming       | Baja        | 1 hora          |
| FASE 10: Testing     | Media       | 4-6 horas       |
| **TOTAL**            |             | **39-53 horas** |

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Antes de Comenzar:

- [ ] Aprobación del plan por el usuario
- [ ] Branch `refactor/codebase-cleanup` creado
- [ ] Backup de estado actual (si aplica)

### Después de cada fase:

- [ ] Tests pasan
- [ ] No hay nuevos warnings de TypeScript
- [ ] Build exitoso
- [ ] Revisión visual de UI

### Al completar todo:

- [ ] 0 компонентов > 200 líneas
- [ ] < 50 any en total
- [ ] 0 TODOs sin implementar
- [ ] 80% coverage en servicios críticos
- [ ] Build pasa
- [ ] Lint pasa

---

## 🚀 COMENZAR

**Para iniciar la ejecución de este plan, responde:**

1. **"Sí, comienza con FASE 1"** - Empezar con componentes críticos
2. **"Sí, comienza con FASE 5"** - Empezar con persistencia (foundation)
3. **"Sí, ejecuta TODO el plan"** - Ejecutar todo en orden
4. **"Ejecuta solo FASE X"** - Ejecutar una fase específica
