/**
 * Sync Services - Módulos para sincronización
 * 
 * Exporta las funciones principales de sincronización.
 * 
 * ARQUITECTURA:
 * 
 *   SyncOrchestrator (NUEVO - Punto de entrada recomendado)
 *       ├── GenericSyncEngine → Catálogos bidireccionales
 *       └── BatchUploader → Datos operativos ERP
 * 
 * Para código NUEVO, usar:
 *   import { syncOrchestrator } from './SyncOrchestrator';
 * 
 * Para código LEGACY, los exports mantienen compatibilidad.
 */

// =============================================================================
// SYNC ORCHESTRATOR (NUEVO)
// =============================================================================
export {
  syncOrchestrator,
  syncAll,
  syncCatalogsOnly,
  syncBatchesOnly,
  getPendingGroups,
  uploadBatch,
  resetSyncLock,
  CATALOG_TABLES,
  registryToSync,
} from './SyncOrchestrator';

export type { SyncResult, SyncStatus } from './SyncOrchestrator';

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
  syncCatalogs,
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
// FSM PARA CONTROL DE FLUJO
// =============================================================================
export { syncFSM } from './fsm';
export { useSyncFSM } from './fsm/useSyncFSM';
export type { SyncState, SyncEvent, SyncContext } from './fsm/types';
