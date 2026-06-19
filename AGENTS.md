# ContarStock v2 - Agente de Desarrollo

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
