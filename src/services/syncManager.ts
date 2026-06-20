/**
 * SyncManager - Wrapper de compatibilidad para sincronización
 * 
 * TODA la lógica ahora usa GenericSyncEngine como motor central.
 * Este archivo solo re-exporta para compatibilidad.
 * 
 * ARQUITECTURA:
 * 
 *   componentes → syncManager → sync/ → CatalogImporter → GenericSyncEngine
 *                                              ↓
 *                                         supabaseSyncService
 * 
 * Para nuevo código, usar directamente:
 * - useGenericSync (hooks React)
 * - genericSyncEngine (servicios)
 */

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

export {
  backupProductsToSupabase,
  backupProvidersToSupabase,
} from './cloudBackupService';

export {
  importCustomersAndTemplatesFromCloud,
} from './sync/CatalogImporter';

export type { UploadGroup } from './sync/UploadGroupBuilder';
