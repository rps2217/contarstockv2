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

// Re-export desde syncManager original
export {
  resetSyncLock,
  reconcileReception,
  syncCatalogs,
  importProductsFromCloud,
  importProvidersFromCloud,
  importCustomersAndTemplatesFromCloud,
  getGlobalPendingCount,
} from '../syncManager';
