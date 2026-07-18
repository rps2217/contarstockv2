/**
 * =============================================================================
 * UNIFIED SYNC MODULE - Índice Público
 * =============================================================================
 *
 * Punto de entrada único para el sistema de sincronización unificado.
 * Reemplaza: GenericSyncEngine, BatchSyncService, RealtimeSyncService, SyncQueueService
 *
 * @example
 * import { unifiedSyncEngine, syncCatalogs, syncAll } from '@/services/sync/unified';
 *
 * // Sincronización completa
 * await syncAll();
 *
 * // Solo catálogos
 * await syncCatalogs();
 *
 * // Encolar un cambio
 * await unifiedSyncEngine.enqueue({
 *   tableName: 'products',
 *   recordId: '123',
 *   operation: 'update',
 *   data: { name: 'New Name' },
 * });
 *
 * @module sync/unified
 */

// Motor principal
export {
  UnifiedSyncEngine,
  unifiedSyncEngine,
  default as UnifiedSyncEngineDefault,
} from './UnifiedSyncEngine';

// Tipos
export type {
  // Tipos base
  SupabaseRow,
  SyncStatus,
  SyncResult,
  TableSyncResult,

  // Estados FSM
  SyncState,
  SyncEvent,

  // Cola offline
  QueuedSyncItem,
  QueueProcessResult,

  // Conflictos
  ConflictResolution,
  ConflictStrategy,
  SyncConflict,

  // Stats
  SyncStats,
  SyncMetrics,

  // Configuración
  SyncEngineConfig,
  DEFAULT_SYNC_CONFIG,

  // Registry
  TableSyncMeta,

  // Eventos
  SyncEventType,
  SyncEventPayload,
  SyncEventListener,
} from './types';

// Registry
export {
  syncRegistry,
  CATALOG_TABLES,
  UPLOAD_ONLY_TABLES,
  getTableMeta,
  isRegistered,
} from './registry';

// Funciones convenientes
import { unifiedSyncEngine, uploadBatch, resetSyncLock } from './UnifiedSyncEngine';

/**
 * Sincronización completa (catálogos + batches)
 */
export const syncAll = () => unifiedSyncEngine.syncAll();

/**
 * Sincroniza solo catálogos
 */
export const syncCatalogs = () => unifiedSyncEngine.syncCatalogs();

/**
 * Sincroniza solo batches pendientes
 */
export const syncBatches = () => unifiedSyncEngine.syncBatches();

/**
 * Encola un cambio para sincronización offline
 */
export const enqueueSync = (item: Parameters<typeof unifiedSyncEngine.enqueue>[0]) =>
  unifiedSyncEngine.enqueue(item);

/**
 * Procesa la cola de sincronización
 */
export const processQueue = () => unifiedSyncEngine.processQueue();

/**
 * Inicia sync en tiempo real
 */
export const startRealtimeSync = () => unifiedSyncEngine.startRealtimeSync();

/**
 * Detiene sync en tiempo real
 */
export const stopRealtimeSync = () => unifiedSyncEngine.stopRealtimeSync();

/**
 * Obtiene estadísticas de sincronización
 */
export const getSyncStats = () => unifiedSyncEngine.getStats();

/**
 * Suscribe a eventos de sincronización
 */
export const addSyncListener = unifiedSyncEngine.addListener.bind(unifiedSyncEngine);

/**
 * Obtiene el estado actual del motor
 */
export const getSyncState = () => unifiedSyncEngine.getState();

// Legacy compatibility exports
export { uploadBatch, resetSyncLock };

// Conflict resolution exports
export { CONFLICT_RESOLUTIONS, getConflictResolutionLabel } from './ConflictResolutionHelper';

// Metrics service export
export { syncMetricsService, default as SyncMetricsService } from './SyncMetricsService';
export type { MetricRecord, MetricOperation, TableMetrics, SyncTrend } from './SyncMetricsService';

// =============================================================================
// MÓDULOS REFACTORIZADOS (Julio 2026)
// =============================================================================

// Helpers utilitarios (Único módulo refactorizado completado)
export {
  formatError,
  extractColumnNameFromError,
  sanitizeData,
  recordSyncMetric,
} from './syncHelpers';

// NOTA: Los siguientes módulos están en desarrollo:
// - SyncFSM
// - SyncQueueProcessor
// - SyncRealtimeManager
// Pendiente: Corregir tipos para completar la refactorización

// =============================================================================
// CONFLICT RESOLVER (Extraído Julio 2026)
// =============================================================================

export {
  SyncConflictResolver,
  getSyncConflictResolver,
  type ConflictResolverOptions,
  type ConflictResolverDeps,
} from './SyncConflictResolver';
