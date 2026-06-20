/**
 * SyncManager - Wrapper de compatibilidad para sincronización
 * 
 * La lógica principal está en:
 * - src/services/sync/ - Servicios modulares
 */

// Re-export desde servicios modulares
export {
  getPendingUploadGroups,
  performBatchUpload,
  syncCatalogs,
  importProductsFromCloud,
  importProvidersFromCloud,
  reconcileReception,
  getGlobalPendingCount,
  resetSyncLock,
} from './sync';

export {
  resetUploadLock,
  getBatchSize,
  isUploadInProgress,
} from './sync/BatchUploader';

// Re-export desde cloudBackupService
export {
  backupProductsToSupabase,
  backupProvidersToSupabase,
} from './cloudBackupService';

// Re-export desde CatalogImporter
export {
  importCustomersAndTemplatesFromCloud,
} from './sync/CatalogImporter';

export type { UploadGroup } from './sync/UploadGroupBuilder';
