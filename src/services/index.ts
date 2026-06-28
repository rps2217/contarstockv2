/**
 * Services - Exports centralizados
 *
 * Arquitectura Lego: Servicios organizados por dominio
 */

// Analytics
export * from './analytics';

// AI Services
export * from './ai';

// Cloud Services - exports específicos para evitar duplicados
export {
  // Batch operations
  pushChange,
  pushBatch,
  deleteRemote,
  queryTable,
  pullBatch,
  uploadPhoto,
  clearTable,
  formatError,
  sanitizeData,
  extractColumnNameFromError,
  // GenericSyncEngine
  genericSyncEngine,
  GenericSyncEngine,
  // Realtime
  startRealtimeSync,
  startFilteredRealtimeSync,
} from './cloud';

export type { SupabaseRow } from './types/common';

// Sync Services - usa el motor unificado
export {
  unifiedSyncEngine,
  syncAll,
  syncCatalogs,
  syncBatches,
  enqueueSync,
  processQueue,
  startRealtimeSync as startRealtimeSyncUnified,
  stopRealtimeSync,
  getSyncStats,
  addSyncListener,
  getSyncState,
  syncRegistry,
  uploadBatch,
  resetSyncLock,
  // Legacy compatibility
  unifiedSyncEngine as syncOrchestrator,
} from './sync';

export type {
  SyncResult,
  SyncState,
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
} from './sync';

// Sync FSM (legacy)
export { syncFSM } from './sync/fsm';
export { useSyncFSM } from './sync/fsm/useSyncFSM';

// Core Services - exports verificados
export { configSyncService } from './configSyncService';
export { dynamicDataService } from './dynamicDataService';
export { InitializationService } from './initializationService';
export { localBrain } from './localBrain';
export { logger } from './logger';

// Constants
export * from './constants';

// Types
export * from './types';
