/**
 * supabaseSyncService - Wrapper de compatibilidad
 * 
 * @deprecated Usar servicios modulares en src/services/cloud/
 * 
 * Servicios disponibles:
 * - RealtimeSyncService: startRealtimeSync, startFilteredRealtimeSync
 * - BatchSyncService: pushChange, pushBatch, deleteRemote, queryTable, pullBatch, uploadPhoto, clearTable
 * 
 * Este archivo se mantiene por compatibilidad con código existente.
 */

import type { SupabaseRow } from './types/common';
import type { LocalTableRepository } from './cloud/RealtimeSyncService';

// Re-export types
export type { SupabaseRow, LocalTableRepository };

// Re-export desde servicios modulares
export {
  startRealtimeSync,
  startFilteredRealtimeSync,
} from './cloud/RealtimeSyncService';

export {
  pushChange,
  pushBatch,
  deleteRemote,
  queryTable,
  pullBatch,
  uploadPhoto,
  clearTable,
  formatError,
  extractColumnNameFromError,
  sanitizeData,
} from './cloud/BatchSyncService';

import { startRealtimeSync, startFilteredRealtimeSync } from './cloud/RealtimeSyncService';
import { 
  pushChange as batchPushChange,
  pushBatch as batchPushBatch,
  deleteRemote as batchDeleteRemote,
  queryTable as batchQueryTable,
  pullBatch as batchPullBatch,
  uploadPhoto as batchUploadPhoto,
  clearTable as batchClearTable,
  formatError,
  extractColumnNameFromError,
} from './cloud/BatchSyncService';

/**
 * @deprecated Usar funciones directas de RealtimeSyncService y BatchSyncService
 */
export const supabaseSyncService = {
  /**
   * @deprecated Usar startRealtimeSync de RealtimeSyncService
   */
  startSync: startRealtimeSync,

  /**
   * @deprecated Usar startFilteredRealtimeSync de RealtimeSyncService
   */
  startFilteredSync: startFilteredRealtimeSync,

  /**
   * @deprecated Usar pushChange de BatchSyncService
   */
  pushChange: batchPushChange,

  /**
   * @deprecated Usar pushBatch de BatchSyncService
   */
  pushBatch: batchPushBatch,

  /**
   * Formats error objects for readable output.
   */
  formatError,

  /**
   * Extract key/column fields from database error messages.
   */
  extractColumnNameFromError,

  /**
   * @deprecated Usar deleteRemote de BatchSyncService
   */
  deleteRemote: batchDeleteRemote,

  /**
   * @deprecated Usar queryTable de BatchSyncService
   */
  query: batchQueryTable,

  /**
   * @deprecated Usar pullBatch de BatchSyncService
   */
  pullBatch: batchPullBatch,

  /**
   * @deprecated Usar clearTable de BatchSyncService
   */
  clearTable: batchClearTable,

  /**
   * @deprecated Usar uploadPhoto de BatchSyncService
   */
  uploadPhoto: batchUploadPhoto,
};
