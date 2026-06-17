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
