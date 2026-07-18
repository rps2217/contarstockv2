/**
 * Sync Services - Modulos para sincronizacion
 *
 * ARQUITECTURA CONSOLIDADA:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                    UNIFIED SYNC ENGINE                        │
 *   │  (Unico punto de entrada para toda la sincronizacion)        │
 *   │                                                               │
 *   │  Combina:                                                    │
 *   │  • GenericSyncEngine (catalogos)                            │
 *   │  • BatchSyncService (operaciones batch)                     │
 *   │  • RealtimeSyncService (tiempo real)                        │
 *   │  • SyncQueueService (cola offline)                          │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Uso recomendado:
 *   import { unifiedSyncEngine } from '@/services/sync';
 */

// =============================================================================
// UNIFIED SYNC ENGINE (UNICO MOTOR)
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
// UPLOAD GROUPING UTILITIES (con compatibilidad)
// =============================================================================
export {
  getPendingUploadGroups,
  getPendingGroups,
  uploadGroupCompat,
  filterGroupsByType,
  sortGroupsByPriority,
  getUploadBatchSize,
} from './UploadGroupBuilder';

export type { UploadGroup } from './UploadGroupBuilder';

// =============================================================================
// RECONCILIATION (Usado por useReceptionLogic)
// =============================================================================
export {
  reconcileReception,
  getGlobalPendingCount,
} from './Reconciliation';

// =============================================================================
// CONFLICT RESOLUTION
// =============================================================================
// NOTA: Los tipos de ConflictResolution se definen en:
// - store/useConflictStore.ts (ConflictRecord)
// - unified/types.ts (ConflictResolution strategy)
// - cloud/ConflictResolution.ts (estrategias)

// =============================================================================
// FSM PARA CONTROL DE FLUJO
// =============================================================================
export { syncFSM } from './fsm';
export { useSyncFSM } from './fsm/useSyncFSM';
export type { SyncState as FSMSyncState, SyncEvent, SyncContext } from './fsm/types';

// =============================================================================
// LEGACY COMPATIBILITY (DataImporter)
// =============================================================================
export {
  importProductsFromCloud,
  importProvidersFromCloud,
  importCustomersAndTemplatesFromCloud,
} from './legacyImports';

// =============================================================================
// Alias para compatibilidad (evitar breaking changes)
// =============================================================================
export { unifiedSyncEngine as syncOrchestrator } from './unified';

// Alias para compatibilidad con hooks que usan GenericSyncEngine
// TODO: Migrar gradualmente a unifiedSyncEngine
export { unifiedSyncEngine as genericSyncEngine } from './unified';
