# ContarStock v2 - Agente de Desarrollo..

## Estructura del Proyecto

```
src/
├── features/           # Modulos de dominio
│   ├── events/
│   ├── counting/
│   ├── sync/
│   └── ...
├── repositories/       # Acceso a datos
│   ├── base/           # IRepository, BaseRepository
│   └── ScanRepository.ts
├── services/          # Logica de negocio
├── shared/            # Componentes compartidos
└── types/             # Definiciones de tipos
```

## TypeScript Conventions

### Manejo de Errores
- Usar `handleError(err: unknown)` para procesar errores en catch blocks
- Para `logger.error()`, pasar strings: `logger.error('MODULE', String(err))`
- Usar `const errorMsg = handleError(err)` en catch blocks antes de usar `errorMsg`

### Tipos de Sync
- `SyncQueueItem` y tipos relacionados estan en `src/types/global/sync.ts`
- Re-exportados en `src/features/sync/types/index.ts`
- No duplicar definiciones de tipos de sync

### Servicios Sync
- `pushBatch<T extends object>()` - usa generics, no `any[]`
- `sanitizeData(data: SupabaseRow): SupabaseRow` - tipos estrictos
- `formatError(e: unknown): string` - metodo existente para formatear errores

### UI Components
- `SyncStatusBadge` usa `Record<string, string>` para acceso dinamico
- `InputProps` debe usar `Omit<InputHTMLAttributes, 'size'>` para evitar conflictos

## Repository Pattern

### Estructura
```
src/repositories/
├── base/
│   ├── IRepository.ts         # Interfaces
│   ├── BaseRepository.ts      # Implementacion Dexie
│   ├── SyncableRepository.ts  # Para entidades con sync
│   └── index.ts
├── ScanRepository.ts          # Repositorio de ejemplo
└── index.ts
```

### Uso
```typescript
// Antiguo (mantener compatibilidad)
import { ScanRepository } from '@/repositories';
await ScanRepository.getAll();

// Nuevo codigo
import { scanRepository } from '@/repositories';
await scanRepository.getAll();
```

## Scripts Disponibles

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write .
npm run test:run     # vitest (single run)
npm run test         # vitest (watch mode)
```

## Refactoring Progress (2024-06-18)

### Completado:
- FASE 0: Setup DX (Husky, ESLint, Prettier, Scripts)
- FASE 1: Repository Pattern Base (IRepository, BaseRepository, SyncableRepository)

### En Progreso:
- FASE 2: Repository Pattern por Dominios

### Pendiente:
- FASE 3: FSM para Sync
- FASE 4: Commands para Sync
- FASE 5: Domain Stores
- FASE 6: Design Tokens
- FASE 7: Type Ownership
- FASE 8: Testing

### Metricas:
- syncManager.ts: 495 lineas (meta: ~150)
- Repository coverage: 50% (meta: 80%)
- Errores TypeScript: 0

---

## Refactoring Tema 3 Colores (2026-06-17)

### Paletas de Colores
| Tema | Background | Primary | Text | Accents |
|------|------------|---------|------|---------|
| dark | slate-950 | blue-500 | gray-100 | blue-400 |
| light | white | blue-600 | slate-900 | slate-500 |
| high-contrast | black | yellow-400 | yellow-400 | yellow-500 |

### Componentes Actualizados (✅)
- **Slices**: SlicesPage, SlicesSidebar, SliceFilters, SlicePreview, CreateSliceModal
- **Reports**: ReportMetrics, ReportFilters, LiveConsolidationGrid, SessionHistoryList, SessionRow, SessionRowSkeleton
- **Settings**: CloudSection, OperationalSection, PreferencesSection, NavigationSection, ModulesSection, ThemeSection, SettingsElements, SupportSection, PrinterSection, DiagnosticsCard, MaintenanceCard, KernelSystemCard, BackupCard, SystemLogsModal, SupabaseAuditorModal, SyncLogsModal
- **Events**: EventItemRow, EventCaptureModal
- **Compliance**: ComplianceDashboardPage + RiskItemRow

### Commits Realizados
- `48d95b91` - fix: Soporte high-contrast en SessionHistory y SessionRow
- `04f0291c` - fix: Soporte theme en componentes Reports y Settings
- `4d6f5f0b` - fix: Soporte theme en Settings components
- `fb0fb63f` - fix: Soporte theme en Settings support cards y modals
- `7cf727f2` - fix: Soporte theme en Events y Compliance

---

## PRODUCTO_PROVEEDOR - Relación Many-to-Many (2026-06-19)

### Estructura de la Tabla
```
┌─────────────────┐     ┌────────────────────────┐     ┌─────────────────┐
│  PRODUCTOS       │     │   PRODUCTO_PROVEEDOR    │     │  PROVEEDORES    │
├─────────────────┤     ├────────────────────────┤     ├─────────────────┤
│ barcode (PK)    │◄────│ product_barcode (FK)   │────►│ rut (PK)        │
│ supplierRut     │     │ provider_rut (FK)       │     │ exchangePolicy   │
└─────────────────┘     │ is_primary (boolean)    │     │ withdrawalDays   │
                         │ has_exchange (nullable) │     │ hasExchange     │
                         │ withdrawal_days (nullable)│    └─────────────────┘
                         └────────────────────────┘
```

### Archivos de Migración
| Archivo | Descripción |
|---------|-------------|
| `docs/migrations/001_create_producto_proveedor.sql` | Schema + vistas |
| `docs/migrations/import_producto_proveedor.py` | Script reutilizable |
| `docs/migrations/migrate_BCM_2026-06-19.sql` | 3,263 registros listos |

### Código Frontend
- `src/repositories/ProductProviderRepository.ts` - Repository con sync
- `src/db.ts` - Interfaz ProductProvider + tabla productProviders
- `src/db/migrations/DbMigrator.ts` - Migración v48
- `src/services/cloud/syncRegistry.ts` - Sync bidireccional

### Estadísticas
- Total filas Excel: 3,263
- Proveedores únicos: 193
- Productos únicos: 3,204

### Commits
- `b3dcdd40` - feat: Scripts de migración para PRODUCTO_PROVEEDOR
- `d3389c9b` - feat: Agregar tabla PRODUCTO_PROVEEDOR al código frontend

---

## Refactoring Progreso (2026-06-20)

### Completado:
- FASE 0: Setup DX ✅
- FASE 1: Repository Pattern Base ✅
- FASE 2: Repository Pattern por Dominios ✅
- **FASE 3: FSM para Sync** ✅ (nueva implementación integrada)
- **FASE 8: Testing** ✅ (142 tests pasando)

### Dead Code Eliminado:
- Commands (SyncOrchestrator, CatalogSyncCommand, etc.) - 622 líneas
- FSM legacy (no integrada) - 464 líneas
- Test huérfano - 186 líneas
- Store duplicado - 64 líneas
- **Total: ~1,583 líneas**

### Nueva FSM Integrada:
- `src/services/sync/fsm/` (nuevo)
  - `SyncFSM.ts` - Clase FSM con transiciones
  - `types.ts` - SyncState, SyncEvent, SyncContext
  - `useSyncFSM.ts` - Hook de React
  - `SyncFSM.test.ts` - Tests unitarios (12 tests)

### Domain Stores Centralizados:
- `src/stores/index.ts` - Exports centralizados
- 71 archivos actualizados para usar `@/stores`
- Stores: useSyncStore, useToastStore, useTaskStore, useExpiryStore, useAppStore, useUIStore, useSettingsStore

### Documentación UI:
- `src/shared/components/ui/docs/COMPONENTS.md` - Docs de componentes

### Commits (2026-06-20):
- `d2b22d94` - Dead Code Cleanup (~1,583 líneas eliminadas)
- `28e5f922` - FSM integrada para sincronización (12 tests)
- `cdd28716` - Domain Stores centralizados + docs UI
- `378bf621` - Actualizar AGENTS.md
- `c577ad26` - Consolidar tipos Sync + tests logger

### Métricas:
- syncManager.ts: 37 líneas ✅
- Sync modules: 4 archivos modulares ✅
- Tests: 149 pasando ✅
- Coverage: 40% statements (logger: 73%)
- Bundle: ~4,476 KB

### Pendientes:
- Aumentar coverage de tests (meta: 60%)
- Tests para Repositories (ScanRepository, SessionRepository)
- Storybook para компоненты UI

---

## Productividad Dashboard - Lego Architecture (2026-06-20)

### Completado:
- **Dashboard Productividad** - Metricas en tiempo real para Counting
- **Modo Turbo** - Conteo rapido sin animaciones
- **Hammer migrado** - Usa ScannerContainer
- **EventCapture actualizado** - Con productividad

### Componentes Compartidos:
- `src/features/counting/hooks/useProductivity.ts`
- `src/features/counting/hooks/useTurboMode.ts`
- `src/features/counting/components/ProductivityDashboard.tsx`
- `src/features/counting/components/TurboModeOverlay.tsx`
- `src/shared/components/scanner/layouts/ScannerContainer.tsx`
- `src/shared/components/scanner/layouts/ScannerCameraSection.tsx`
- `src/shared/components/scanner/layouts/ScannerFeedbackOverlay.tsx`
- `src/shared/components/scanner/layouts/LabelPreviewModal.tsx`

### Atajos de Teclado:
- `Alt+P` - Toggle dashboard productividad
- `Alt+Shift+T` - Toggle modo turbo

### Commits:
- `2179b67a` - refactor: Migrar Hammer a ScannerContainer
- `a8776f25` - feat: Agregar dashboard de productividad a EventCapture
- `d35cdcd4` - fix: Corregir nombres de tabla a minusculas en scripts SQL

---

## UI Sync Simplification + Migración GenericSyncEngine (2026-06-20)

### Componentes UI Unificados:

| Componente | Líneas | Reemplaza |
|------------|--------|-----------|
| **SyncQueuePanel** | 224 | SyncQueue + SyncQueueList + SyncQueueDetail |
| **SyncActivity** | 220 | Logs inline + Incidents inline |

### hooks Migrados a GenericSyncEngine:

| Hook | Antes | Después |
|------|-------|---------|
| useProductSync | cloudSync.ts | GenericSyncEngine.pushIncremental |
| useProvidersSync | cloudSync.ts | GenericSyncEngine.pushIncremental |

### Archivos Eliminados/Deprecados:
- `cloudSync.ts` - Marcado como deprecated (vacío)
- `supabaseSyncService.ts` - Wrapper deprecated (usado internamente)

### Commits UI Sync:
- `ae78a1c4` - feat: Crear SyncQueuePanel unificado
- `fd0d9205` - feat: Crear SyncActivity unificado
- `xxxxxxx` - refactor: Migrar hooks a GenericSyncEngine

### Métricas:
- SyncCenterPage: 349 → 256 líneas (-93)
- Componentes sync: más cohesivos
- Tests: 149 pasando ✅
