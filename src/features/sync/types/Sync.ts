/**
 * Tipos para el módulo de Sincronización
 */

// Estado de sincronización
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

// Tipo de sync
export type SyncType = 'full' | 'partial' | 'realtime';

// Tablas disponibles para sincronizar
export interface SyncTable {
  name: string;
  displayName: string;
  lastSync?: number;
  recordCount?: number;
  status: 'synced' | 'pending' | 'error' | 'never';
}

// Resultado de una operación de sync
export interface SyncOperationResult {
  success: boolean;
  tableName: string;
  recordsProcessed: number;
  recordsFailed: number;
  duration: number;
  error?: string;
  timestamp: number;
}

// Estadísticas de sync
export interface SyncStats {
  totalRecords: number;
  syncedRecords: number;
  pendingRecords: number;
  failedRecords: number;
  lastSyncTime?: number;
  syncProgress: number;
}

// Configuración de sync para una tabla
export interface SyncTableConfig {
  tableName: string;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  enableRealtime: boolean;
}

// Estado del sync manager
export interface SyncManagerState {
  isOnline: boolean;
  isSyncing: boolean;
  currentOperation?: string;
  progress: number;
  tables: SyncTable[];
  stats: SyncStats;
  error?: string;
  lastError?: {
    table: string;
    message: string;
    timestamp: number;
  };
}

// Acciones disponibles para el sync manager
export interface SyncManagerActions {
  syncAll: () => Promise<void>;
  syncTable: (tableName: string) => Promise<void>;
  forceSync: () => Promise<void>;
  cancelSync: () => void;
  clearError: () => void;
  refreshStatus: () => Promise<void>;
}

// Evento de sync para logging
export interface SyncEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  table?: string;
  progress?: number;
  message?: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

// Ítem de la cola de sincronización
export interface SyncQueueItem {
  id: string;
  key: string;
  tableName: string;
  displayName?: string;
  status: 'pending' | 'pending_delete' | 'error' | 'synced';
  timestamp?: number;
  error?: string;
  data?: Record<string, unknown>;
}

// Tipos de tab en SyncCenterPage
export type SyncTabType = 'tables' | 'queue' | 'incidents';

// Log de sync
export interface SyncLogEntry {
  table: string;
  status: 'success' | 'error' | 'warning';
  msg: string;
  timestamp: number;
}
