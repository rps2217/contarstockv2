// Re-export from global
export type { SyncQueueItem, SyncResult, PushResult, PullResult, TableStats, SyncState } from '@/types/global/sync';
export type { SyncTabType, SyncLogEntry } from '@/types/global/sync';

// ============================================
// SYNC STATUS
// ============================================

export type SyncFSMState = 'idle' | 'preparing' | 'uploading' | 'waiting' | 'processing' | 'success' | 'error' | 'retrying';

export type ItemSyncStatus = 'synced' | 'pending' | 'error' | 'conflict';

// ============================================
// SYNC CONFIG
// ============================================

export interface SyncConfig {
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
  autoSync: boolean;
  syncOnWifiOnly: boolean;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  batchSize: 500,
  retryAttempts: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  autoSync: true,
  syncOnWifiOnly: false,
};

// ============================================
// UPLOAD GROUP
// ============================================

export interface UploadGroup {
  erpOrder: string;
  sessionCount: number;
  totalUnits: number;
  sessionIds: string[];
  logisticsLabels: string[];
  type: 'inventory' | 'reception' | 'products' | 'orphans' | 'dynamic';
  isHammer: boolean;
  tableName?: string;
}

// ============================================
// SYNC INCIDENT
// ============================================

export interface SyncIncident {
  id: string;
  table: string;
  error: string;
  timestamp: number;
  resolved: boolean;
}

// ============================================
// CONNECTION STATUS
// ============================================

export interface ConnectionStatus {
  isOnline: boolean;
  isSupabaseConnected: boolean;
  latencyMs: number | null;
  lastCheckAt: number;
}
