# 🔍 Análisis de Código Duplicado y Oportunidades de Simplificación

## Resumen Ejecutivo

| Categoría | Archivos Afectados | Impacto |
|----------|-------------------|---------|
| Repositorios Base | 3 versiones | Alto |
| Componentes Badge | 5+ variantes | Medio |
| Funciones de Fecha | 4+ versiones | Medio |
| Sync Engines | 8+ archivos | Alto |
| Funciones de Normalización | 3+ versiones | Bajo |

---

## 1. REPOSITORIOS BASE DUPLICADOS

### Archivos identificados:
- `src/repositories/BaseRepository.ts` (296 líneas)
- `src/repositories/core/BaseDexieRepository.ts` (45 líneas)
- `src/repositories/base/SyncableRepository.ts` (verificar)

### Problema:
Hay dos implementaciones base con funcionalidad similar pero no son usadas consistentemente.

### Recomendación:
```typescript
// Consolidar en un solo archivo: src/repositories/BaseRepository.ts
// Mantener la versión más completa (BaseRepository.ts)
// Eliminar BaseDexieRepository.ts o mantenerlo como interfaz mínima
```

---

## 2. SISTEMAS DE BADGE DUPLICADOS

### Archivos identificados:
| Archivo | Componente | Uso |
|---------|-----------|-----|
| `src/shared/components/ui/Badge.tsx` | Badge genérico | Props: variant, color, size |
| `src/shared/components/ui/design-system/StatusBadge.tsx` | StatusBadge | Props: status, label |
| `src/features/sync/components/SyncStatusBadge.tsx` | SyncStatusBadge | Props: synced, pending, error |
| `src/shared/components/ui/VirtualBadge.tsx` | VirtualBadge | Props: StockStatusBadge, PercentageBadge, DaysBadge |
| `src/lib/ui.tsx` | getSessionStatusBadge, getSyncLogStatusBadge | Helpers de funciones |

### Problema:
Múltiples componentes que hacen cosas similares pero con APIs diferentes.

### Recomendación:
```tsx
// Consolidar en un solo componente: src/shared/components/ui/StatusBadge.tsx
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  status?: 'synced' | 'pending' | 'error' | 'expired' | 'critical';
  label?: string;
  icon?: LucideIcon;
}

// Uso unificado:
// <Badge variant="success" status="synced" label="Sincronizado" />
```

---

## 3. FUNCIONES DE FORMATEO DE FECHAS

### Archivos identificados:
| Archivo | Funciones |
|---------|-----------|
| `src/lib/date.ts` | formatTimeAgo, formatSyncDate, formatDetailDateTime, formatTimeHHMMSS, formatTimeWithDate, formatDateShort, formatDuration |
| `src/lib/ui.tsx` | formatDate, formatDetailDate, formatDateTime, formatTime, formatDuration, formatSeconds |
| `src/shared/utils/common.ts` | formatTimestamp, formatDate, formatTime |
| `src/features/expiry/domain/expiryDomain.ts` | formatExpiryDate |
| `src/features/reception/domain/receptionDomain.ts` | formatReceptionDate |
| `src/features/expected-orders/domain/expectedOrdersDomain.ts` | formatRelativeDate |

### Problema:
9+ funciones de formato de fecha con funcionalidad superpuesta.

### Recomendación:
```typescript
// Consolidar en: src/lib/date.ts

export const formatDate = (timestamp?: number | string | null, options?: FormatOptions): string;
export const formatTime = (timestamp?: number | string | null): string;
export const formatDateTime = (timestamp?: number | string | null): string;
export const formatRelative = (timestamp: number): string; // "hace 5 min"
export const formatDuration = (ms: number): string; // "5m", "2h"

// Unificar aliases y exports
export { formatDate as format, formatDateTime as formatFull } from './date';
```

---

## 4. SISTEMAS DE SINCRONIZACIÓN DUPLICADOS

### Archivos identificados (8+ archivos):
```
src/services/cloud/
├── GenericSyncEngine.ts
├── GenericSyncEngineEnhanced.ts  ← Posible duplicado
├── SyncQueue.ts
├── SyncQueueService.ts           ← Posible duplicado
├── SyncBridge.ts
├── RealtimeSyncService.ts
├── BatchSyncService.ts
└── EventsSyncService.ts

src/services/
├── hammerSync.ts
├── dynamicSync.ts
└── configSyncService.ts

src/features/*/hooks/
├── useCountingSync.ts
├── useProductSync.ts
├── useProvidersSync.ts
└── useSync*.ts (varios)
```

### Problema:
Demasiados engines de sync con funcionalidad similar.

### Recomendación:
```typescript
// Crear abstracción unificada: src/services/sync/SyncEngine.ts
interface SyncEngine {
  sync(): Promise<SyncResult>;
  getStatus(): SyncStatus;
  queue(operation: SyncOperation): void;
}

// Mantener implementaciones específicas solo si tienen lógica muy diferente
```

---

## 5. FUNCIONES DE NORMALIZACIÓN

### Archivos identificados:
| Función | Ubicación | Descripción |
|---------|-----------|-------------|
| `normalizeSku` | `src/shared/utils/common.ts` | Normaliza SKU básico |
| `normalizeSku` | `src/services/utils.ts` | Wrapper de sanitizeBarcode |
| `sanitizeBarcode` | `src/services/utils.ts` | Más estricta, elimina chars control |
| `normalizeIdentity` | `src/services/utils.ts` | Para RUT/ID |
| `normalizeHeader` | `src/services/utils.ts` | Para cabeceras Excel |

### Recomendación:
```typescript
// Consolidar en: src/lib/normalize.ts
export const normalizeBarcode = (code: string): string => { ... };
export const normalizeSku = (val: string): string => normalizeBarcode(val);
export const normalizeIdentity = (val: string): string => { ... };
export const normalizeHeader = (h: string): string => { ... };

// Re-exportar desde utils para compatibilidad
export { normalizeBarcode, normalizeSku, normalizeIdentity, normalizeHeader } from './normalize';
```

---

## 6. CÓDIGO POTENCIALMENTE MUERTO

### Archivos sin imports detectados:
```
src/features/settings/components/
├── NavigationSection.tsx
├── PrinterSection.tsx
├── CloudSection.tsx
├── OperationalSection.tsx
├── SupportSection.tsx
├── ThemeSection.tsx
├── PreferencesSection.tsx
└── ModulesSection.tsx

src/features/hammer/components/
├── KeyboardShortcutsHelp.tsx
├── IndustrialScannerList.tsx
├── MassiveToolsSheet.tsx
├── IndustrialScanFeedback.tsx
└── HammerCameraView.tsx

src/features/expected-orders/components/
├── SavedOrdersList.tsx
├── OrderPreviewList.tsx
└── OrderImporter.tsx

src/features/dashboard/
└── DashboardPage.tsx
```

### ⚠️ Nota:
Algunos de estos pueden estar siendo usados dinámicamente o por nombre diferente. Se recomienda verificar con análisis más profundo.

---

## 7. FUNCIONES calculateStats DUPLICADAS

### Archivos identificados:
| Función | Ubicación |
|---------|-----------|
| `calculateCountingMetrics` | `src/features/counting/domain/countingDomain.ts` |
| `calculateCustomerStats` | `src/features/customers/domain/customersDomain.ts` |
| `calculateProviderStats` | `src/features/suppliers/domain/suppliersDomain.ts` |
| `calculateExpiryStats` | `src/features/expiry/utils/expiryProcessor.ts` |
| `calculateOrderStats` | `src/features/expected-orders/domain/expectedOrdersDomain.ts` |
| `calculateReceptionStats` | `src/features/reception/domain/receptionDomain.ts` |
| `calculateProductStats` | `src/features/inventory/domain/productsDomain.ts` |

### Problema:
Cada módulo tiene su propia versión de calculateStats.

### Recomendación:
Crear un patrón común o usar type generics:
```typescript
// src/lib/stats.ts
export interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export function calculateStats<T extends { createdAt?: number }>(
  items: T[],
  dateField: keyof T = 'createdAt'
): Stats { ... }
```

---

## 8. GRAFICO DE DEPENDENCIAS POR MÓDULO

```
features/
├── counting/     (4945 líneas) - Dependencias: counting, sync, expiry, hammer
├── expiry/       (4471 líneas) - Dependencias: counting, inventory
├── inventory/    (3557 líneas) - Dependencias: counting, suppliers
├── sync/         (3171 líneas) - Dependencias: counting, inventory, suppliers
├── settings/     (2717 líneas) - Dependencias: sync, theme
├── expected-orders/ (2261 líneas) - Dependencias: counting, hammer
├── hammer/       (2190 líneas) - Dependencias: counting, inventory
├── suppliers/    (1995 líneas) - Dependencias: inventory
├── reception/    (1688 líneas) - Dependencias: inventory, counting
├── reports/      (1652 líneas) - Dependencias: counting, expiry
└── customers/    (1126 líneas) - Dependencias: inventory
```

---

## PRIORIDADES DE IMPLEMENTACIÓN

### Alta Prioridad (Mayor Impacto):
1. ✅ Consolidar repositorios base
2. ✅ Unificar sistema de sync engines
3. ✅ Consolidar funciones de fechas

### Media Prioridad:
4. ⚠️ Unificar componentes Badge
5. ⚠️ Consolidar funciones normalize
6. ⚠️ Crear patrón común para calculateStats

### Baja Prioridad:
7. 🔄 Verificar código muerto
8. 🔄 Limpiar exports no usados

---

## ESTIMACIÓN DE ESFUERZO

| Tarea | Líneas a Modificar | Riesgo |
|-------|-------------------|--------|
| Repositorios Base | ~50 | Bajo |
| Sistema de Sync | ~500 | Alto |
| Funciones de Fecha | ~200 | Medio |
| Badge Components | ~300 | Medio |
| Normalize Utils | ~50 | Bajo |
| Stats Pattern | ~100 | Bajo |

**Total estimado: ~1200 líneas en 6-8 archivos**

---

*Generado: 2026-07-15*
*Versión del análisis: 1.0*
