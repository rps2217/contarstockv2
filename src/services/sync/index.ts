/**
 * Sync Services - Módulos para sincronización
 *
 * ARQUITECTURA CONSOLIDADA:
 * 
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                    UNIFIED SYNC ENGINE                        │
 *   │  (Nuevo punto de entrada único - 1 motor para todo)          │
 *   │                                                               │
 *   │  Combina:                                                    │
 *   │  • GenericSyncEngine (catálogos)                            │
 *   │  • BatchSyncService (operaciones batch)                     │
 *   │  • RealtimeSyncService (tiempo real)                        │
 *   │  • SyncQueueService (cola offline)                          │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Para código NUEVO, usar:
 *   import { unifiedSyncEngine } from './unified';
 *
 * Para código LEGACY, usar:
 *   import { syncOrchestrator } from './SyncOrchestrator';
 */

// =============================================================================
// UNIFIED SYNC ENGINE (NUEVO - RECOMENDADO)
// =============================================================================
export {
  unifiedSyncEngine,
  syncAll,
  syncCatalogs,
  syncBatches,
  enqueueSync,
  processQueue,
  startRealtimeSync,
  stopRealtimeSync,
  getSyncStats,
  addSyncListener,
  getSyncState,
  syncRegistry,
  CATALOG_TABLES,
  uploadBatch,
  resetSyncLock,
} from './unified';

export type {
  SyncResult,
  SyncState,
  SyncStatus,
  QueuedSyncItem,
  QueueProcessResult,
  TableSyncResult,
  SyncConflict,
  SyncStats,
  SyncEngineConfig,
  TableSyncMeta,
  SyncEventType,
  SyncEventPayload,
  SyncEventListener,
} from './unified';

// =============================================================================
// SYNC ORCHESTRATOR (COMPATIBILIDAD LEGACY)
// =============================================================================
export {
  syncOrchestrator,
  syncAll as syncAllLegacy,
  syncCatalogsOnly,
  syncBatchesOnly,
  registryToSync,
} from './SyncOrchestrator.compat';

export type { SyncResult as SyncResultLegacy, SyncStatus as SyncStatusLegacy } from './SyncOrchestrator.compat';

// =============================================================================
// UPLOAD GROUPING UTILITIES
// =============================================================================
export {
  getPendingUploadGroups,
  filterGroupsByType,
  sortGroupsByPriority,
  getUploadBatchSize,
} from './UploadGroupBuilder';

export type { UploadGroup } from './UploadGroupBuilder';

// =============================================================================
// BATCH UPLOADER
// =============================================================================
export {
  performBatchUpload,
  resetUploadLock,
  getBatchSize,
  isUploadInProgress,
} from './BatchUploader';

// =============================================================================
// CATALOG IMPORTER
// =============================================================================
export {
  syncCatalogs as syncCatalogsImporter,
  importProductsFromCloud,
  importProvidersFromCloud,
  importCustomersAndTemplatesFromCloud,
} from './CatalogImporter';

// =============================================================================
// RECONCILIATION
// =============================================================================
export {
  reconcileReception,
  getGlobalPendingCount,
} from './Reconciliation';

// =============================================================================
// FSM PARA CONTROL DE FLUJO (PARA CÓDIGO LEGACY)
// =============================================================================
export { syncFSM } from './fsm';
export { useSyncFSM } from './fsm/useSyncFSM';
export type { SyncState as FSMSyncState, SyncEvent, SyncContext } from './fsm/types';

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================
export { uploadGroupCompat } from './uploadBatchCompat';
export { getPendingGroups } from './SyncOrchestrator.compat';

