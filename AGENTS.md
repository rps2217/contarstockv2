
---

## Rediseño de Interfaz - Migración de Estilos (2026-06-28)

### Sistema de Variables CSS
El rediseño implementa un sistema de tokens de diseño unificados:

```css
/* Tema Oscuro (Default) */
--bg-base: #09090b      /* bg-base - Fondo principal */
--bg-surface: #18181b    /* bg-surface - Cards, modales */
--bg-elevated: #27272a   /* bg-elevated - Elementos elevados */
--border-subtle: rgba(255,255,255,5%)  /* border-subtle */
--text-primary: #f4f4f5 /* text-primary */
--text-secondary: #a1a1aa/* text-secondary */
--text-muted: #71717a   /* text-muted */
--color-primary: #3b82f6/* Acento azul */
```

### Reemplazos Masivos Aplicados
| Patrón Antiguo | Patrón Nuevo | Archivos |
|---------------|--------------|----------|
| bg-slate-950 | bg-base | 130 |
| bg-slate-900 | bg-surface | 130 |
| bg-slate-800 | bg-elevated | 130 |
| bg-neutral-950 | bg-base | - |
| bg-neutral-900 | bg-surface | - |
| border-slate-800 | border-subtle | 130 |
| text-slate-400 | text-muted | 130 |
| text-slate-300 | text-secondary | 130 |
| text-slate-200 | text-primary | 130 |

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
| Función | Ubicación | Uso |
|---------|-----------|-----|
| `formatSyncDate()` | `lib/date.ts` | SyncHistory, SyncActivity |
| `formatTimeWithDate()` | `lib/date.ts` | SyncQueuePanel, SyncQueueList, SyncActivity |
| `formatTimeHHMMSS()` | `lib/date.ts` | SyncActivity |
| `formatDetailDateTime()` | `lib/date.ts` | Uso general |
| `getSessionStatusBadge()` | `lib/ui.tsx` | CountingKanbanView |
| `getSyncLogStatusBadge()` | `lib/ui.tsx` | SyncLogsModal |
| `DesignStatusBadge` | `design-system/StatusBadge.tsx` | RecordDetailView |

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
  stockStatus,        // Badge: ok/warning/critical
  stockPercentage,     // % stock vs mínimo
  daysUntilExpiry,    // Días para vencer
  expiryStatus,       // Badge: ok/warning/expired
  stockValue,         // stock * precio
  isCriticalStock,    // boolean
  needsReorder,       // boolean
]
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
registerWorkflow(createStockAlertWorkflow());  // Stock bajo
registerWorkflow(createExpiryAlertWorkflow());  // Próximo vencimiento
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
const { batchId = 'CORE' } = useParams()
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
  await MassiveDbRepository.deleteBlindManifestsByBatch(batchId)
  setShowSessionModal(false)
  toast.success('Carga teórica eliminada. Los escaneos se mantienen.')
}
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
