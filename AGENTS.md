
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

## Optimización de Bundles y Performance (2026-06-27)

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
