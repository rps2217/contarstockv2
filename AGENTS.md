---

## 📋 ESTADO ACTUAL DEL PROYECTO (2026-07-17)

### ✅ VALIDACIÓN ACTUAL

```bash
npm run test:run   # 915 tests passing (actualizado 2026-07-18)
npx tsc --noEmit   # 0 errores TypeScript
npm run build      # Build exitoso
```

### 📊 MÉTRICAS DE CÓDIGO

| Métrica     | Valor   |
| ----------- | ------- |
| LOC Totales | 133,953 |
| Archivos TS | 705     |
| Tests       | 964     |
| Cobertura   | ~7.2%   |

### 📈 PROGRESO DE REFACTORIZACIÓN (Fase 3)

| Archivo | Inicio | Actual | Reducción | Estado |
|---------|--------|--------|-----------|--------|
| ExpiryPage.tsx | 1,292 | 928 | -364 (-28%) | ✅ |
| TheoreticalLoadsPage.tsx | 1,150 | 984 | -166 (-14%) | ✅ |
| ThermalPrinterEngine.ts | 1,059 | 1,044 | -15 (-1%) | ✅ |
| UnifiedSyncEngine.ts | 1,346 | 1,202 | -144 (-11%) | 🔄 |

**Total reducido:** 689 líneas extraídas de archivos monolíticos

### Archivos Extraídos

| Archivo | Descripción |
|---------|------------|
| `syncHelpers.ts` | Helpers utilitarios (formatError, sanitizeData) |
| `syncQueueProcessor.ts` | Lógica de procesamiento de cola |
| `syncTableOperations.ts` | Operaciones de sincronización por tabla |
| `escposCommands.ts` | Comandos ESC/POS para impresoras |
| `expiryConstants.ts` | Constantes de expiración |
| `expiryHelpers.ts` | Helpers de fechas y colores |
| `expiryRecordRow.tsx` | Fila de registro |
| `expiryKanbanCard.tsx` | Tarjeta kanban |
| `expirySection.tsx` | Sección colapsable |
| `theoreticalLoadsCards.tsx` | Tarjetas de órdenes y manifiestos |

### 🔴 PROBLEMAS CRÍTICOS CONOCIDOS

1. **Archivos monolíticos** (>1000 LOC):
   - `UnifiedSyncEngine.ts` (1,491 LOC)
   - `ExpiryPage.tsx` (1,378 LOC)
   - `TheoreticalLoadsPage.tsx` (1,325 LOC)
   - `ThermalPrinterEngine.ts` (1,144 LOC)
   - `EventsModal.tsx` (1,054 LOC)

2. **Tipos `any`**: ~795 ocurrencias

3. **Memory leaks potenciales**:
   - 78 `addEventListener` sin remove
   - 45 `setInterval` sin clearInterval

4. **Cobertura de tests baja**: 7.2%

### 🎯 TAREAS PENDIENTES DE REFACTORIZACIÓN

#### 1. ExpiryPage.tsx (1,292 LOC) - ✅ COMPLETADO

**Estado:** Refactorización completada
**Archivos extraídos:**

- `ExpiryPage/expiryConstants.ts` - STATUS_META, STATUS_ORDER, MONTHS, FILTERS
- `ExpiryPage/expiryHelpers.ts` - formatExpiryDate, getExpiryDateColor, getWithdrawalDateColor
- `ExpiryPage/expiryRecordRow.tsx` - RecordRow (fila de lista)
- `ExpiryPage/expiryKanbanCard.tsx` - KanbanCard (tarjeta kanban)
- `ExpiryPage/expirySection.tsx` - Section (sección colapsable)

**Reducción:** 1292 → 928 LOC (-364 líneas, -28%)

#### 2. TheoreticalLoadsPage.tsx (1,150 LOC) - ✅ COMPLETADO

**Estado:** Refactorización completada
**Archivos extraídos:**

- `TheoreticalLoadsPage/theoreticalLoadsCards.tsx` - LocalOrderCard, CloudManifestCard

**Reducción:** 1150 → 984 LOC (-166 líneas, -14%)

#### 3. UnifiedSyncEngine.ts (1,346 LOC) - EN PROGRESO

**Estado:** ~11% refactorizado
**Archivos extraídos:**

- `syncHelpers.ts` - Helpers utilitarios ✅
- `syncQueueProcessor.ts` - Lógica de procesamiento de cola ✅
- `syncTableOperations.ts` - Operaciones de sincronización por tabla ✅

**Reducción:** 1346 → 1202 LOC (-144 líneas, -11%)

**Pendiente:**

- Extraer lógica de pullTable (~130 líneas)
- Extraer lógica de conflictos

#### 4. ThermalPrinterEngine.ts (1,059 LOC) - EN PROGRESO

**Estado:** Comandos ESC/POS extraídos
**Archivos extraídos:**

- `thermal-print/escposCommands.ts` - Constantes y generadores de tickets

**Pendiente:**

- Integrar escposCommands en ThermalPrinterEngine
- Extraer lógica de conexión USB/Bluetooth

### 📁 DOCUMENTACIÓN EXISTENTE

| Documento                          | Descripción                  |
| ---------------------------------- | ---------------------------- |
| `docs/QUALITY_ANALYSIS.md`         | Análisis completo de calidad |
| `docs/REFACTOR_PROGRESS.md`        | Progreso de refactorización  |
| `docs/BUNDLE_OPTIMIZATION_PLAN.md` | Plan de optimización         |
| `docs/HOOKS_REUTILIZABLES.md`      | Arquitectura de hooks        |

### 🏗️ ARQUITECTURA CONOCIDA

- **Stores:** `@/stores` (barrel exports)
- **Hooks:** `@/shared/hooks` (barrel exports)
- **UI Components:** `@/shared/components/ui`
- **Features:** `@/features/*`
- **Sync:** `@/services/sync/unified`

### 🔧 COMANDOS ÚTILES

```bash
# Verificar estado
npm run test:run
npx tsc --noEmit

# Tests de contrato
npm run test:run -- src/__tests__/contracts/

# Feature flags
isFeatureEnabled('FEATURE_KEY')  # Verificar
toggleFeature('FEATURE_KEY')     # Cambiar
```

---

## Auditoría Profunda de Código - Julio 2026

### Commits de Refactorización (10 commits)

| Commit    | Descripción                                      | Reducción  |
| --------- | ------------------------------------------------ | ---------- |
| `d1e3222` | Extraer SyncConflictResolver                     | -118 LOC   |
| `029d23e` | Eliminar código muerto expected-orders           | -1,176 LOC |
| `400cb19` | Extraer HammerHeader de HammerPage               | -77 LOC    |
| `eb1bb76` | Extraer componentes de ExpiryPage                | -88 LOC    |
| `2019d38` | Extraer OrderDetailModal de TheoreticalLoadsPage | -175 LOC   |
| `4882a9b` | Extraer HTML generator de ThermalPrinterEngine   | -241 LOC   |
| `24c735b` | Extraer constantes de EventsModal                | -57 LOC    |
| `99473a6` | Extraer constantes y hooks de ExpiryCaptureModal | -74 LOC    |
| `e7150fe` | Extraer ReceptionCard de ReceptionPage           | -87 LOC    |
| `7e3e538` | Extraer componentes de ReportsPage               | -77 LOC    |

### Archivos Reducidos

| Archivo                  | Antes | Después | Reducción        |
| ------------------------ | ----- | ------- | ---------------- |
| ExpiryPage.tsx           | 1,378 | 1,290   | -88              |
| TheoreticalLoadsPage.tsx | 1,325 | 1,150   | -175             |
| EventsModal.tsx          | 1,054 | 1,130   | +76 (modificado) |
| ThermalPrinterEngine.ts  | 1,144 | 972     | -241             |
| ExpiryCaptureModal.tsx   | 927   | 853     | -74              |
| ReceptionPage.tsx        | 774   | 687     | -87              |
| ReportsPage.tsx          | 724   | 647     | -77              |

### Componentes Extraídos

| Componente             | Archivo                      | Descripción              |
| ---------------------- | ---------------------------- | ------------------------ |
| HammerHeader           | HammerPage/HammerHeader.tsx  | Header con stats         |
| ExpiryHeader           | ExpiryPage/ExpiryHeader.tsx  | Header con filtros       |
| ExpiryFilters          | ExpiryPage/ExpiryFilters.tsx | Filtros avanzados        |
| OrderDetailModal       | TheoreticalLoadsPage/        | Modal de detalle         |
| reportHtmlGenerator    | thermal-print/               | Generador HTML impresión |
| eventsConstants        | EventsModal/                 | Tipos y constantes       |
| expiryCaptureConstants | ExpiryCaptureModal/          | Hook de teclado          |
| ReceptionCard          | ReceptionPage/               | Tarjeta de recepción     |
| reportComponents       | ReportsPage/                 | StatCard y MiniChart     |

### Reducción Total

- **Líneas eliminadas del código principal**: ~900 LOC
- **Archivos monolíticos reducidos**: 7 archivos
- **Componentes reutilizables creados**: 9 módulos

---

## Rediseño de Interfaz - Migración de Estilos (2026-06-28)

### Sistema de Variables CSS

El rediseño implementa un sistema de tokens de diseño unificados:

```css
/* Tema Oscuro (Default) */
--bg-base: #09090b /* bg-base - Fondo principal */ --bg-surface: #18181b
  /* bg-surface - Cards, modales */ --bg-elevated: #27272a /* bg-elevated - Elementos elevados */
  --border-subtle: rgba(255, 255, 255, 5%) /* border-subtle */ --text-primary: #f4f4f5
  /* text-primary */ --text-secondary: #a1a1aa /* text-secondary */ --text-muted: #71717a
  /* text-muted */ --color-primary: #3b82f6 /* Acento azul */;
```

### Reemplazos Masivos Aplicados

| Patrón Antiguo   | Patrón Nuevo   | Archivos |
| ---------------- | -------------- | -------- |
| bg-slate-950     | bg-base        | 130      |
| bg-slate-900     | bg-surface     | 130      |
| bg-slate-800     | bg-elevated    | 130      |
| bg-neutral-950   | bg-base        | -        |
| bg-neutral-900   | bg-surface     | -        |
| border-slate-800 | border-subtle  | 130      |
| text-slate-400   | text-muted     | 130      |
| text-slate-300   | text-secondary | 130      |
| text-slate-200   | text-primary   | 130      |

### Commits de Rediseño

- `384a428a` - refactor: Reemplazo masivo de estilos (130 archivos)
- `825c28d9` - docs: Diagrama de funcionamiento

---

## Optimización de Bundles y Performance (2026-06-27, Actualizado 2026-07-07)

### Configuración de Chunks en vite.config.ts

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-ui': ['lucide-react', 'framer-motion', 'motion', 'sonner'],
  'vendor-charts': ['recharts'],          // Separado para lazy loading
  'vendor-db': ['dexie', 'dexie-react-hooks'],
  'vendor-export': ['xlsx', 'jspdf', 'jspdf-autotable'],
  'vendor-parse': ['papaparse', 'jszip'],
  'vendor-date': ['date-fns'],
  'vendor-scanner': ['html5-qrcode', 'qrcode.react'],
  'vendor-gemini': ['@google/genai'],
  'vendor-transformers': ['@xenova/transformers']
}
```

### Lazy Loading de Recharts

- `SparklineChart` ahora carga recharts dinámicamente con `import('recharts')`
- Muestra skeleton mientras carga

### Componentes Memoizados

- `EventCard` - Card de eventos
- `EventHeader` - Header de eventos
- `EventFormHeader` - Header de formulario

### Commits:

- `4e959715` - perf: Optimización de bundles y memoización

---

## Refactorización: Eliminación de Funciones Duplicadas (2026-06-27)

### Archivos Centralizados

```
src/lib/
├── ui.tsx       # Helpers UI: getSessionStatusBadge, getSyncLogStatusBadge, getStatusColor
├── date.ts      # Helpers fecha: formatTimeAgo, formatSyncDate, formatTimeWithDate, formatDuration
└── utils.ts     # cn() - combinación de clases
```

### Funciones Centralizadas

| Función                   | Ubicación                       | Uso                                         |
| ------------------------- | ------------------------------- | ------------------------------------------- |
| `formatSyncDate()`        | `lib/date.ts`                   | SyncHistory, SyncActivity                   |
| `formatTimeWithDate()`    | `lib/date.ts`                   | SyncQueuePanel, SyncQueueList, SyncActivity |
| `formatTimeHHMMSS()`      | `lib/date.ts`                   | SyncActivity                                |
| `formatDetailDateTime()`  | `lib/date.ts`                   | Uso general                                 |
| `getSessionStatusBadge()` | `lib/ui.tsx`                    | CountingKanbanView                          |
| `getSyncLogStatusBadge()` | `lib/ui.tsx`                    | SyncLogsModal                               |
| `DesignStatusBadge`       | `design-system/StatusBadge.tsx` | RecordDetailView                            |

### Commits de Refactorización:

- `4e959715` - perf: Optimización de bundles y memoización
- `d7078ed2` - fix: Hacer props opcionales en ScannerToolsSheet
- `edc16a88` - refactor: Unificar funciones de formateo en SyncIncidents
- `cbe587c0` - refactor: Unificar formateo de fechas en componentes sync
- `d3b22dc9` - fix: Corregir errores de compilación por refs faltantes
- `2dc2793c` - refactor: Unificar funciones duplicadas de status y fechas
- `249d6505` - refactor: Eliminar formatEventDate duplicado
- `214e78e6` - refactor: Usar cn() centralizado y mejorar formatTimeAgo
- `08737412` - refactor: Extraer getMetricColorClasses a lib/ui.tsx
- `113fb949` - refactor: Unificar formatDate en DetailModals
- `d89e93cb` - refactor: Crear src/lib/ui.tsx con helpers centralizados
- `78301e5b` - refactor: Unificar formatCurrency y normalizeSku
- `f58125f2` - refactor: Unificar utilerías y componentes redundantes

---

## ThemeCustomizer - Personalizacion Avanzada (2026-06-24)...

### Componente

- ThemeCustomizer - Personalizador completo de temas

### Caracteristicas:

- Sliders: Ajuste de Matiz, Saturacion, Brillo para 7 colores
- Preview: Vista previa en tiempo real
- Guardado Local: Automatico en localStorage
- Guardado en Nube: Callback opcional onSaveToCloud
- Exportar/Importar: Esquemas como archivos JSON
- Esquemas: Predefinidos + personalizados
- Inyeccion CSS: Aplica colores en document.documentElement

### Colores Ajustables:

- primary, success, warning, error, info, expired, critical

### Variables CSS Generadas:

- --color-primary, --color-primary-hover, --color-primary-pressed, --color-primary-subtle
- --color-success, --color-success-subtle
- --color-warning, --color-warning-subtle
- --color-error, --color-error-subtle
- --color-info, --color-info-subtle
- --color-expired, --color-critical

### Commits:

- 56dec72a - feat: ThemeCustomizer
- cdb21295 - feat: Mejoras en ThemeCustomizer - Unificacion de colores y CSS variables

---

## Arquitectura Consolidada (2026-07-05)

### Estructura de Directorios

```
src/
├── store/                    # Stores core (archivo único)
│   ├── useSyncStore.ts
│   ├── useToastStore.ts
│   ├── useTaskStore.ts
│   ├── useExpiryStore.ts
│   ├── useAppStore.ts
│   ├── usePermissionStore.ts  # RBAC
│   ├── useConflictStore.ts    # Resolución de conflictos
│   ├── useAuditStore.ts       # Logs de auditoría
│   └── useUndoRedoStore.ts    # Undo/Redo
│
├── stores/                   # Barrel exports
│   └── index.ts              # Exporta todos los stores
│
├── features/                 # Módulos de negocio
│   ├── inventory/
│   ├── counting/
│   ├── reception/
│   ├── sync/
│   ├── dashboard/
│   ├── settings/
│   └── ...
│
├── shared/
│   ├── hooks/                # Hooks compartidos
│   │   └── index.ts         # Exports centralizados
│   └── components/
│       ├── ui/               # Componentes atómicos
│       ├── redesign/         # Páginas redesignadas
│       ├── sync/             # ConflictResolver
│       ├── audit/            # AuditPanel
│       └── settings/         # RoleSettings
│
├── services/                 # Servicios de negocio
├── repositories/             # Capa de datos
└── db/                      # Dexie (IndexedDB)
```

### Imports Consolidados

```typescript
// Stores - usar '@/stores'
import { useSyncStore, useToastStore } from '@/stores';
import { usePermissionStore, ROLE_LABELS } from '@/stores';
import { useAuditStore, AuditLog } from '@/stores';

// Hooks - usar '@/shared/hooks'
import { usePermissions, RequirePermission } from '@/shared/hooks';
import { useGlobalSearch } from '@/shared/hooks';

// Componentes UI
import { Button, Modal, Badge } from '@/shared/components/ui';
```

### Commits de Arquitectura:

- `89020d17` - refactor: Consolidar imports usando barrel exports @/stores
- `b63925e1` - refactor: Consolidar exports de stores y hooks
- `c2371314` - feat: Integrar RoleSettings y AuditPanel en Settings
- `8b0ae15f` - feat: Conectar rutas y mejorar navegación

---

## Características Inspiradas en AppSheet (2026-07-05)

### 1. Row-Level Security (RLS)

Sistema de filtros de datos por ubicación/almacén con sincronización de roles.

**Archivos:**

- `src/store/useRowLevelSecurityStore.ts` - Store principal
- `src/shared/hooks/useRLSFilter.tsx` - Hook para componentes
- `src/shared/components/ui/WarehouseSelector.tsx` - Selector UI

**Integración con Roles:**

```typescript
// App.tsx sincroniza automáticamente:
// - Admin → bypass=true (ve todo)
// - Supervisor → acceso completo con filtros por sección
// - Operador → filtrado por warehouse/ubicación
// - Viewer → solo lectura, filtrado por ubicación
```

**API:**

```typescript
import { useRLS, useWarehouseAccess, useWarehouseSelector } from '@/stores';

// Hook principal
const { filter, isAdmin, context } = useRLS();

// Selector de almacén
const { warehouses, activeWarehouse, setWarehouse } = useWarehouseAccess();
<WarehouseSelector />  // Componente UI listo para usar

// Filtrar datos
const filteredProducts = filter(products, 'products');
```

**Concepto:** Técnicos solo ven productos de su almacén, supervisores ven sus secciones.

---

### 2. Virtual Fields (Campos Calculados)

Campos que se calculan en tiempo real sin persistir en BD.

**Archivo:** `src/lib/virtualFields.ts`

**Campos predefinidos:**

```typescript
PRODUCT_VIRTUAL_FIELDS = [
  stockStatus, // Badge: ok/warning/critical
  stockPercentage, // % stock vs mínimo
  daysUntilExpiry, // Días para vencer
  expiryStatus, // Badge: ok/warning/expired
  stockValue, // stock * precio
  isCriticalStock, // boolean
  needsReorder, // boolean
];
```

**Uso:**

```typescript
import { computeVirtualFields, PRODUCT_VIRTUAL_FIELDS } from '@/lib/virtualFields';

const fields = computeVirtualFields(product, PRODUCT_VIRTUAL_FIELDS, { today: new Date() });
// { stockStatus: { value: 'warning', label: 'Estado Stock', ... }, ... }
```

---

### 3. Expression DSL

Motor de expresiones declarativas tipo AppSheet.

**Archivo:** `src/lib/expressionEngine.ts`

**Ejemplos:**

```typescript
import { evaluateExpression, INVENTORY_RULES } from '@/lib/expressionEngine';

// Evaluar expresión
const result = evaluateExpression('stock < minStock and minStock > 0', { stock: 5, minStock: 10 });
// → false

// Usar reglas predefinidas
const alerts = INVENTORY_RULES.filter(r => r.enabled);
```

**Funciones disponibles:**

- `now()`, `today()` - Fechas
- `diffDays(a, b)` - Diferencia en días
- `contains(s, sub)`, `startsWith()`, `endsWith()` - Texto
- `if(cond, trueVal, falseVal)` - Lógicos
- `abs()`, `min()`, `max()`, `round()` - Números

---

### 4. Workflow Engine

Automatizaciones basadas en eventos.

**Archivo:** `src/lib/workflowEngine.ts`

**Concepto:** Cuando X ocurre → Hacer Y

```typescript
import { createStockAlertWorkflow, initializeWorkflows } from '@/lib/workflowEngine';

// Inicializar
initializeWorkflows();

// Trigger manual
const results = await executeWorkflows('products', product, 'updated');

// Workflow predefinidos
registerWorkflow(createStockAlertWorkflow()); // Stock bajo
registerWorkflow(createExpiryAlertWorkflow()); // Próximo vencimiento
```

**Tipos de trigger:**

- `created` - Al crear registro
- `updated` - Al actualizar
- `deleted` - Al eliminar
- `condition` - Por schedule
- `manual` - Manual

**Tipos de acción:**

- `notify` - Notificación toast
- `log` - Registrar en consola
- `audit` - Registrar en auditoría
- `webhook` - Llamar API externa

---

### 5. Exportación de Auditoría

Exportar logs a Excel/CSV.

**Archivo:** `src/lib/auditExport.ts`

```typescript
import { exportAuditLogs, generateAuditSummary, useAuditExport } from '@/lib/auditExport';

// Exportar a Excel
await exportAuditLogs(logs, { format: 'xlsx', startDate, endDate });

// Resumen
const summary = generateAuditSummary(logs);
// { totalLogs, todayCount, byAction, bySeverity, recentErrors }

// Hook
const { exportLogs, isExporting } = useAuditExport();
```

---

### Commits de Features:

- `546f9ada` - feat: Implementar características inspiradas en AppSheet

---

## Corrección: Carga Teórica Persistente en Hammer (2026-07-07)

### Problema Identificado

Al acceder al modo Hammer mediante `/massive` sin batchId, se usaba el batchId por defecto `'CORE'`. Esto causaba que:

1. Los datos de `blindManifests` y `blindScans` se persistían con batchId `'CORE'`
2. Al volver a entrar, los mismos datos se recuperaban automáticamente
3. El modal de sesión existente preguntaba si continuar, pero no distinguía entre escaneos y carga teórica

### Causa Raíz

```typescript
// ANTES: batchId por defecto era 'CORE'
const { batchId = 'CORE' } = useParams();
```

Cada vez que el usuario accedía a `/massive`, se reutilizaba el mismo `'CORE'`, trayendo datos de sesiones anteriores.

### Solución Implementada

**1. Generación de batchId único automático:**

```typescript
// Función para generar un batchId único basado en UUID
const generateHammerBatchId = (): string => {
  const uuid = generateUUID();
  return `HM-${uuid.substring(0, 8).toUpperCase()}`;
};

// En el componente:
const [effectiveBatchId] = useState(() => {
  const paramBatchId = params.batchId;
  if (paramBatchId && paramBatchId !== 'CORE' && paramBatchId.trim() !== '') {
    return paramBatchId;
  }
  return generateHammerBatchId();
});

// Redirigir a la nueva URL si es 'CORE' o vacío
useEffect(() => {
  if (params.batchId === 'CORE' || !params.batchId || params.batchId.trim() === '') {
    window.history.replaceState(null, '', `/massive/${effectiveBatchId}`);
  }
}, [params.batchId, effectiveBatchId]);
```

**2. Separación de escaneos vs carga teórica:**

```typescript
// Nuevo estado para mostrar al usuario
const [sessionCounts, setSessionCounts] = useState({ scans: 0, manifests: 0 });

// Al detectar sesión existente, obtener conteos separados
const counts = await MassiveDbRepository.getBatchCounts(effectiveBatchId);
setSessionCounts(counts);
```

**3. Opción para limpiar solo la carga teórica:**

```typescript
// Limpiar solo la carga teórica (manifests) pero mantener los escaneos
const handleClearTheoreticalOnly = async () => {
  await MassiveDbRepository.deleteBlindManifestsByBatch(batchId);
  setShowSessionModal(false);
  toast.success('Carga teórica eliminada. Los escaneos se mantienen.');
};
```

**4. Modal mejorado con información clara:**

- Muestra: "Escaneos guardados: X" y "Carga teórica importada: Y"
- Opciones: Continuar, Descartar carga teórica, Limpiar todo, Nueva sesión

### Archivos Modificados

- `src/repositories/MassiveDbRepository.ts` - Métodos `getBatchCounts`, `getBlindManifestCountByBatch`, `getBlindScanCountByBatch`
- `src/shared/components/redesign/pages/HammerPage.tsx` - Generación de batchId único, modal mejorado, opción de limpiar solo teórica

### Flujo Corregido

1. Usuario accede a `/massive` → Se genera `HM-A1B2C3D4` automáticamente
2. Usuario importa carga teórica → Se guarda con ese batchId
3. Usuario cierra navegador y vuelve a entrar
4. Si accede a `/massive` (sin batchId) → Se genera NUEVO batchId → Sesión limpia
5. Si comparte/enlaza a `/massive/HM-A1B2C3D4` → Recupera la sesión original

---

## Mejoras de Julio 2026 (2026-07-07)

### Fix Hammer: Auto-descartar Carga Teórica Antigua

**Commit**: `f12febde`

**Problema**: Al comenzar un conteo, se recuperaba automáticamente una carga teórica descartada.

**Solución**:

- Nuevo método `getBatchSessionInfo()` para información detallada de sesiones
- Auto-descarte de carga teórica si tiene más de 24h o nunca fue usada
- Modal de sesión mejorado con información contextual

### Refactorización: Nomenclatura (massiveDb → hammerDb)

**Commit**: `2c492062`

**Cambios**:

- `MassiveDbRepository` → `HammerDbRepository`
- `massiveSync.ts` → `hammerSync.ts`
- `massiveDb` → `hammerDb` en todo el codebase
- 37 archivos actualizados

### Optimización Bundle: Lazy Loading de IA

**Commit**: `0dda50ac`

**Mejoras**:

- `localBrain.ts`: Import dinámico de `@xenova/transformers`
- `visionService.ts`: Import dinámico de `@google/genai`
- Los módulos de IA ahora solo se cargan cuando se necesitan

### Commits Recientes

- `0dda50ac` - perf: Convertir imports estáticos a dinámicos
- `2c492062` - refactor: Renombrar massiveDb a hammerDb
- `efad2a1c` - chore: Refactorizaciones y mejoras del codebase
- `f12febde` - fix(hammer): Auto-descartar carga teórica antigua

### Fix Modal Ubicación

**Commit**: `99b9f57e`

**Problema**: El modal de ubicación se abría automáticamente al entrar al módulo Hammer.

**Solución**:

- LocationSelectorModal ahora se renderiza condicionalmente
- Solo se muestra cuando `locManager.isModalOpen` es `true`

### Tests Unitarios: HammerDbRepository

**Commit**: `41f113d2`

**Tests agregados** (9 tests):

- `getBlindScansByBatch`: Retorna escaneos por batchId
- `bulkAddBlindScans`: Agrega múltiples escaneos
- `getBatchCounts`: Retorna conteos de escaneos y manifests
- `getBatchSessionInfo`: Información detallada de sesión
- `getBatchSummary`: Combina escaneos y manifests

### Cobertura de Tests

- **Tests actuales**: 653 tests pasando
- **Tests nuevos**: 9 tests para HammerDbRepository
- **Pendientes**: Integrar tests fallidos de SyncFSM, Tooltip

### Mejora UI: Modal de Importación

**Commit**: `13668dd2`

**Mejoras**:

- Cards con iconos grandes y badges de estado (Nube, ERP, Offline)
- Campo de búsqueda para filtrar órdenes locales
- Preview de items al seleccionar una orden
- Indicador visual de sincronización con nube
- Animaciones spring más fluidas con framer-motion
- Toast de confirmación al importar
- Diseño moderno con gradientes sutiles

**Vista mejorada**:

- Header con título e icono
- Tabs: "Nueva Importación" | "Locales (N)"
- Cards expandibles con preview de productos
- Footer con acciones contextuales

### Mejora UI: Modales de TheoreticalLoadsPage

**Commit**: `a2c9e8c0`

**OrderDetailModal mejorado**:

- Header con icono grande y badges (tipo documento, sincronizado)
- Stats en cards grandes (SKUs y unidades)
- Sección de información estructurada
- Preview de items (primeros 5)
- Botón "Iniciar Conteo" directo

**ConfirmModal mejorado**:

- Animaciones spring más fluidas
- Nuevo variant "success" con color verde
- Prop `extraInfo` para mostrar información adicional
- Icono personalizable con prop `icon`

---

## Registro Opcional de Vencimiento en Hammer (2026-07-07)

### Problema Original

El modo **Hammer** no solicitaba fecha de vencimiento al escanear, solo conteo rápido.

### Solución Implementada

Toggle en herramientas de Hammer para activar registro de vencimiento.

### Archivos Modificados

| Archivo                                               | Cambio                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/features/hammer/hooks/useHammerLogic.ts`         | Estado `registerExpiry`, `awaitingExpiry`, funciones `handleExpiryComplete`, `handleExpiryCancel` |
| `src/shared/components/redesign/pages/HammerPage.tsx` | Import `TestModeExpiryModal`, toggle UI, modal integrado                                          |

### Flujo de Uso

1. Abrir **Herramientas** (⚙️) en Hammer
2. Activar toggle **"Registrar Vencimiento"**
3. Escanear productos → aparece modal para capturar `mm/yyyy`
4. Guardar o **Omitir** (no registra vencimiento)
5. Datos guardados en `expirations` (IndexedDB) vía `ExpiryService`

### Datos Registrados

```typescript
{
  barcode: string;
  productName: string;
  mm: number; // Mes
  yyyy: number; // Año
  quantity: number;
  sessionId: string; // batchId de Hammer
  location: string; // Ubicación actual
  status: 'valid' | 'warning' | 'expired' | 'critical';
  timestamp: number;
  syncStatus: 'pending' | 'synced';
}
```

### Commits

- `80c44ede` - feat(hammer): Agregar registro opcional de fecha de vencimiento

---

## Sistema de Feature Flags (2026-07-07)

### Propósito

Centralizar toggles de features para permitir activacion/desactivacion sin redeploy.

### Archivo

`src/config/features.ts`

### Uso

```typescript
import { isFeatureEnabled, toggleFeature, useFeature } from '@/config/features';

// Verificar si una feature está activa
if (isFeatureEnabled('HAMMER_EXPIRY')) {
  // Mostrar feature
}

// Togglear una feature
toggleFeature('HAMMER_EXPIRY');

// Hook para React
const isEnabled = useFeature('HAMMER_EXPIRY');
```

### Features Registradas

| Key                | Label                             | Default | Category     |
| ------------------ | --------------------------------- | ------- | ------------ |
| HAMMER_EXPIRY      | Registro de Vencimiento en Hammer | false   | core         |
| COUNTING_PHARMA    | Vencimiento en Modo Conteo        | true    | core         |
| REDESIGN_PAGES     | Paginas Redesignadas              | true    | core         |
| EXPORTS_EXCEL      | Exportacion a Excel               | true    | integrations |
| THERMAL_PRINTER    | Impresion Termica                 | true    | integrations |
| CLOUD_SYNC         | Sincronizacion en la Nube         | true    | integrations |
| AI_ASSISTANT       | Asistente AI                      | false   | experimental |
| ADVANCED_FILTERS   | Filtros Avanzados                 | true    | core         |
| ROW_LEVEL_SECURITY | Seguridad a Nivel de Fila         | false   | security     |
| VIRTUAL_FIELDS     | Campos Virtuales                  | false   | experimental |
| AUDIT_LOGS         | Logs de Auditoria                 | true    | security     |

### Panel de Administracion

Ubicacion: `Settings > Sistema > Feature Flags`

El panel permite:

- Ver todas las features por categoria
- Toggle individual de cada feature
- Resetear todas a valores default
- Ver warnings de modo experimental

### Agregar Nueva Feature

1. Agregar entrada en `FEATURES_REGISTRY` en `src/config/features.ts`
2. Usar `isFeatureEnabled('MI_FEATURE')` en el codigo
3. Agregar test de contrato en `src/__tests__/contracts/`
4. La feature aparecera automaticamente en el panel

---

## Modularización: Cargas Teóricas (2026-07-07)

### Módulo Unificado

**Ruta:** `/theoretical-loads` (anteriormente `/expected-orders`)

**Ubicación en menú:** `Cargas Teóricas` (lateral)

**Componente:** `TheoreticalLoadsPage`

### Funcionalidades Integradas

| Funcionalidad            | Implementación                       |
| ------------------------ | ------------------------------------ |
| Lista de órdenes locales | `ExpectedOrderRepository.getAll()`   |
| Importación CSV          | `NewOrderForm` component             |
| Importación paste        | `NewOrderForm` component             |
| Envío a Hammer           | `importLocalExpectedOrderToHammer()` |
| Impresión térmica        | `thermalPrinter` service             |
| Manifiestos ERP          | `erpService`                         |

### Archivos Eliminados

- `ExpectedOrdersPage.tsx` (duplicado)
- `useExpectedOrders.ts` (reemplazado por `NewOrderForm`)
- Ruta `/expected-orders` (redirigida)

---

## Workflow para Agentes AI (2026-07-07)

### Antes de Modificar Archivos

1. **Analizar dependencias**: `grep -r "archivo" src/ --include="*.tsx"`
2. **Verificar contratos existentes**: Revisar `src/__tests__/contracts/`
3. **Identificar feature flag**: Si es feature nueva, agregar a `features.ts`

### Estructura de Commits

```
<tipo>(<modulo>): <descripcion corta>

CONTRATO:
- <campo agregado/removido/modificado>
- <riesgo de regresion>

ROLLBACK: git revert <commit>
```

### Tipos de Commit

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización sin cambio de funcionalidad
- `docs`: Documentación
- `test`: Tests

### Tests de Contrato

Ubicacion: `src/__tests__/contracts/*.contract.test.ts`

Ejecutar antes de commits:

```bash
npm run test:run -- src/__tests__/contracts/
```

### Feature Flags

- **NUNCA** hardcodear features como booleanos sueltos
- **SIEMPRE** usar `isFeatureEnabled('FEATURE_KEY')`
- **NUEVAS** features van en `FEATURES_REGISTRY` con `defaultEnabled`

### Rollback Rapido

```bash
# Deshabilitar feature sin revert
setFeature('MI_FEATURE', false)

# Revert completo
git revert HEAD
```

### Monitoreo Post-Deploy

Despues de deploy, verificar:

1. `npm run test:run` pasa
2. `npx tsc --noEmit` no tiene errores
3. Feature visible en entorno de produccion

---

## Unificación de Módulos de Conteo (2026-07-08)

### Objetivo

Fusionar los módulos de conteo Hammer (modo ciego) y Counting (modo con carga teórica) en un flujo unificado.

### Archivos Creados

| Archivo                                                        | Descripción                              |
| -------------------------------------------------------------- | ---------------------------------------- |
| `src/features/counting/components/StartCountingModal.tsx`      | Modal unificado de inicio con wizard     |
| `src/features/counting/components/TheoreticalLoadSelector.tsx` | Selector reutilizable de cargas teóricas |
| `src/features/counting/components/index.ts`                    | Exports centralizados                    |
| `src/features/counting/hooks/useCountingEngine.ts`             | Hook de lógica centralizada              |

### Archivos Eliminados

| Archivo                                                   | Razón                      |
| --------------------------------------------------------- | -------------------------- |
| `src/features/hammer/components/LoadTheoreticalModal.tsx` | Código muerto, no se usaba |

### Archivos Modificados

| Archivo                                                 | Cambio                           |
| ------------------------------------------------------- | -------------------------------- |
| `src/features/counting/hooks/index.ts`                  | Agregados exports del nuevo hook |
| `src/shared/components/redesign/pages/CountingPage.tsx` | Integrado el modal de inicio     |
| `src/shared/components/redesign/pages/HammerPage.tsx`   | Integrado el modal de inicio     |

### Características del StartCountingModal

- Selección visual entre "Conteo Ciego" y "Conteo con Carga Teórica"
- Toggle opcional para registrar vencimiento en modo ciego
- Selector de cargas teóricas con tabs (Locales / Nube / Stock)
- Preview de la carga seleccionada con cantidad de SKUs
- Indicador de pasos (wizard style)
- Animaciones fluidas con framer-motion

### API del useCountingEngine

```typescript
const {
  isStarting, // Estado de carga
  currentSession, // Sesión actual
  startCounting, // Iniciar conteo (config) => Promise<void>
  resumeSession, // Reanudar sesión (sessionId)
  clearSession, // Limpiar sesión
  generateBatchId, // Generar ID único
  isBlindMode, // Detectar modo ciego
} = useCountingEngine();
```

### Flujo de Usuario

```
/counting (sin ID)
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Nuevo Conteo                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ¿Qué tipo de conteo deseas realizar?                        │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │ 🥽 CONTEO CIEGO          │  │ 📋 CONTEO CON CARGA     │ │
│  │    (modo ráfaga)         │  │    TEÓRICA              │ │
│  └──────────────────────────┘  └──────────────────────────┘ │
│                                                              │
│  → Si Ciego: ¿Registrar vencimiento? (toggle)             │
│  → Si Teórico: Seleccionar carga (Locales/Nube/Stock)        │
│                                                              │
│  [Cancelar]                              [Iniciar Conteo ▶] │
└─────────────────────────────────────────────────────────────┘
    ↓
/massive/HM-XXXXXXXX (modo ciego)
    o
/counting/session-uuid (modo teórico)
```

### Rutas Actuales

- `/counting` → CountingPage (muestra modal de inicio)
- `/counting/:id` → CountingPage (continúa sesión existente)
- `/massive` → HammerPage (muestra modal de inicio)
- `/massive/:batchId` → HammerPage (continúa sesión ciego)

### TheoreticalLoadSelector - Componente Reutilizable

Componente para seleccionar cargas teóricas (usado por StartCountingModal):

```typescript
import { TheoreticalLoadSelector } from '@/features/counting/components';

<TheoreticalLoadSelector
  selectedLoad={selectedLoad}
  onSelectLoad={setSelectedLoad}
  isLoading={false}
  compact={false}
/>
```

Props:

- `selectedLoad`: SelectedLoad | null - Carga seleccionada
- `onSelectLoad`: (load: SelectedLoad | null) => void
- `isLoading`: boolean (opcional)
- `compact`: boolean (opcional) - Modo compacto

### useCountingEngine - API Completa

```typescript
const engine = useCountingEngine();

// Estado
engine.isStarting; // boolean - Cargando
engine.currentSession; // CountingSessionInfo | null

// Acciones
engine.startCounting(config); // Iniciar conteo
engine.resumeSession(id); // Reanudar sesión
engine.clearSession(); // Limpiar sesión
engine.generateBatchId(); // Generar ID único
engine.isBlindMode(id); // Detectar modo ciego

// Hooks adicionales
useActiveSessions(); // Sesiones activas (blind + theoretical)
useSessionInfo(id); // Info de una sesión
```

### syncConfig.ts - Abstracción de Configuración de Sync

Archivo centralizado para configuración de sincronización:

```typescript
import {
  getSyncTableConfig,
  getTargetTable,
  isBlindSessionId,
  SYNC_CONSTANTS,
} from '@/lib/syncConfig';

// Obtener tablas configuradas
const tables = getSyncTableConfig();
// { counts: 'CONTEOS', sessions: 'SESIONES_CONTEO', products: 'PRODUCTOS', orders: 'PEDIDOS' }

// Obtener tabla específica
const countsTable = getTargetTable('counts');

// Verificar tipo de sesión
isBlindSessionId('HM-12345678'); // true
isBlindSessionId('session-abc'); // false

// Constantes
SYNC_CONSTANTS.BATCH_PREFIX; // 'HM-'
SYNC_CONSTANTS.BATCH_SIZE; // 100
SYNC_CONSTANTS.MANIFEST_AUTO_DISCARD_HOURS; // 24
```

### Próximos Pasos (Pendientes)

1. ~~Refactorizar HammerPage ImportModal~~ - Mantenido por funcionalidad específica (preview items, sync status)
2. ~~Refactorizar Sync Logic~~ - Creado `syncConfig.ts` con abstracción mínima compartida:
   - `hammerSync.ts`: Migración de datos (hammerDb ↔ db)
   - `useCountingSync.ts`: Sincronización realtime (Supabase ↔ db)
   - `syncConfig.ts`: Configuración centralizada para tablas y constantes
3. ~~Actualizar Sidebar~~ - Hecho: "Capturar" → "/counting"
4. ~~Agregar tests unitarios~~ - Tests de contrato para useCountingEngine (22 tests)
5. **UX Review** - Pendiente: Probar flujo completo en ambiente local

---

## Auditoría de Código - Sesión 2026-07-18

### Commits Realizados

| Commit    | Descripción                                             | LOC Eliminadas |
| --------- | ------------------------------------------------------- | -------------- |
| `1fca789` | Unificar funciones de formateo de fecha                 | ~15            |
| `5d30d0e` | Usar generateUUID centralizado en EventsSyncService     | ~11            |
| `64a380a` | Usar normalizeIdentity centralizado en providerImporter | ~5             |

### Funciones Centralizadas

| Archivo Original            | Función Duplicada          | Función Centralizada                |
| --------------------------- | -------------------------- | ----------------------------------- |
| CountingHistory.tsx         | formatDate                 | formatDetailDateTime                |
| ConflictResolverModal.tsx   | formatTimestamp            | formatDetailDateTime                |
| ConflictResolutionModal.tsx | formatDate                 | formatDetailDateTime                |
| AuditPanel.tsx (ui)         | formatTimestamp            | formatDetailDateTime                |
| AuditPanel.tsx (audit)      | formatTimestamp            | formatDetailDateTime                |
| RecordDetailView.tsx        | formatTimestamp            | formatDetailDateTime                |
| EventsSyncPanel.tsx         | formatTime, formatFullDate | formatTimeAgo, formatDetailDateTime |
| EventsSyncService.ts        | generateUUID               | generateUUID                        |
| providerImporter.ts         | normalizeIdentity          | normalizeIdentity                   |

### Verificación de Memory Leaks

Se verificó que todos los servicios con `addEventListener` tienen métodos `destroy()` con `removeEventListener`:

- ✅ SyncQueue.ts - método destroy() presente
- ✅ OfflineSyncQueue.ts - método destroy() presente
- ✅ ScanBufferService.ts - método destroy() presente
- ✅ SyncQueueService.ts - método destroy() presente

### Estado Final

- **Tests**: 915/915 ✅
- **TypeScript**: 0 errores ✅
- **Commits sesión**: 3 refactorizaciones menores
