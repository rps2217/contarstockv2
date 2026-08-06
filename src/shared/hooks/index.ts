/**
 * Shared Hooks - Índice de hooks compartidos
 *
 * Arquitectura reorganizada para seguir el patrón Lego:
 *
 * Hooks de productividad:
 * - useProductivity: Métricas de productividad en tiempo real
 * - useTurboMode: Modo turbo de conteo rápido
 *
 * Hooks de sincronización:
 * - useSync: Hook unificado de sincronización
 *
 * Hooks de bulk operations:
 * - useBulkOperations: Operaciones masivas sobre registros
 * - useBulkExport: Exportación de datos
 * - useViewPreferences: Preferencias de vista
 *
 * Hooks de búsqueda:
 * - useGlobalSearch: Búsqueda global unificada
 * - useScanner: Wrapper unificado para escaneo
 */

// ============================================================================
// Core hooks
// ============================================================================
export * from './useTheme';
export * from './useCloudCache';
export * from './useAsyncState';
export * from './useSoftDelete';
export * from './usePaginatedQuery';

// ============================================================================
// Productividad y conteo
// ============================================================================
export { useProductivity } from './useProductivity';
export type { ProductivityStats } from './useProductivity';

// ============================================================================
// Sincronización unificada
// ============================================================================
export { useSync, useAutoSyncLegacy, useManualSync, useScheduledSyncLegacy } from './useSync';
export type { UseSyncOptions, UseSyncReturn, SyncMode } from './useSync';

// ============================================================================
// Cola offline
// ============================================================================
export { useOfflineSync, OfflineIndicator, OfflineRecoveryBanner } from './useOfflineSync';
export type { UseOfflineSyncReturn } from './useOfflineSync';

// ============================================================================
// Sincronización de eventos (con deduplicación)
// ============================================================================
export { useEventsSync, eventsSyncService } from './useEventsSync';
export type { UseEventsSyncOptions, UseEventsSyncReturn, EventStats } from './useEventsSync';
export type { EventSyncResult } from '@/services/cloud/EventsSyncService';

// ============================================================================
// Acciones reutilizables (conteo, Hammer)
// ============================================================================
export { useExpiryActions } from './useExpiryActions';

// ============================================================================
// Exportación de datos
// ============================================================================
export { useExport } from './useExport';
export type { ExportFormat, ExportColumn, UseExportOptions, UseExportReturn } from './useExport';

// ============================================================================
// Búsqueda y escaneo
// ============================================================================
export { useGlobalSearch } from './useGlobalSearch';
export type {
  SearchResult,
  SearchResults,
  UseGlobalSearchOptions,
  UseGlobalSearchReturn,
} from './useGlobalSearch';

export { useScanner } from './useScanner';
export type { UseScannerOptions, UseScannerReturn } from './useScanner';

// ============================================================================
// Bulk Operations (re-export desde hooks/bulk/)
// ============================================================================
export * from '@/hooks/bulk';

// ============================================================================
// Virtualization
// ============================================================================
export { useVirtualList, useDynamicVirtualList } from './useVirtualList';
export type { UseVirtualListOptions, UseVirtualListReturn, VirtualItem } from './useVirtualList';

// ============================================================================
// Keyboard Awareness (Móvil)
// ============================================================================
export { useKeyboardAware, KeyboardAwareContainer } from './useKeyboardAware';

// ============================================================================
// Permisos y Accesos (RBAC)
// ============================================================================
export { usePermissions, RequirePermission } from './usePermissions';

// ============================================================================
// Undo/Redo
// ============================================================================
export {
  showUndoToast,
  useUndoToast,
  UndoIndicator,
  useUndoRedoShortcuts,
} from '@/shared/components/ui/UndoRedoToast';
