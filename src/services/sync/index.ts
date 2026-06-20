/**
 * Sync Services - Módulos para sincronización
 * 
 * Exporta las funciones principales de sincronización.
 */

// Upload grouping utilities from UploadGroupBuilder
export {
  getPendingUploadGroups,
  filterGroupsByType,
  sortGroupsByPriority,
  getUploadBatchSize,
} from './UploadGroupBuilder';

export type { UploadGroup } from './UploadGroupBuilder';

// Batch uploader
export {
  performBatchUpload,
  resetUploadLock,
  getBatchSize,
  isUploadInProgress,
} from './BatchUploader';

// Catalog importer
export {
  syncCatalogs,
  importProductsFromCloud,
  importProvidersFromCloud,
} from './CatalogImporter';

// Reconciliation
export {
  reconcileReception,
  getGlobalPendingCount,
} from './Reconciliation';

// Re-export desde syncManager original
export {
  resetSyncLock,
} from './BatchUploader';
