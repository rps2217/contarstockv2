

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
