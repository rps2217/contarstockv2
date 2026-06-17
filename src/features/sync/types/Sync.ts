/**
 * Sync Types
 */
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';
export type SyncType = 'full' | 'partial' | 'realtime';

export interface SyncTable {
  name: string;
  displayName: string;
  lastSync?: number;
  recordCount?: number;
  status: 'synced' | 'pending' | 'error' | 'never';
}

export interface SyncOperationResult {
  success: boolean;
  tableName: string;
  recordsProcessed: number;
  recordsFailed: number;
  duration: number;
  error?: string;
  timestamp: number;
}

export interface SyncStats {
  totalRecords: number;
  syncedRecords: number;
  pendingRecords: number;
  failedRecords: number;
  lastSyncTime?: number;
  syncProgress: number;
}

export interface SyncTableConfig {
  tableName: string;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  enableRealtime: boolean;
}

export interface SyncManagerState {
  isOnline: boolean;
  isSyncing: boolean;
  currentOperation?: string;
  progress: number;
  tables: SyncTable[];
  stats: SyncStats;
  error?: string;
}

export interface SyncEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  table?: string;
  progress?: number;
  message?: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface SyncQueueItem {
  id: string;
  key: string;
  tableName: string;
  localTable?: string;
  remoteTable?: string;
  primaryKey?: string;
  displayName?: string;
  status: 'pending' | 'pending_delete' | 'error' | 'synced';
  timestamp?: number;
  error?: string;
  data?: Record<string, unknown>;
  rawData?: Record<string, unknown>;
}

export type SyncTabType = 'tables' | 'queue' | 'incidents';

export interface SyncLogEntry {
  table: string;
  status: 'success' | 'error' | 'warning' | 'syncing';
  msg: string;
  timestamp?: number;
}
