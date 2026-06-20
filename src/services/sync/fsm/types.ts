/**
 * Sync FSM Types - Tipos para la máquina de estados de sincronización
 */

export type SyncState = 
  | 'idle' 
  | 'preparing' 
  | 'uploading' 
  | 'waiting' 
  | 'processing' 
  | 'success' 
  | 'error' 
  | 'retrying';

export type SyncEvent = 
  | { type: 'START' }
  | { type: 'PREPARED' }
  | { type: 'UPLOADING'; progress?: number }
  | { type: 'WAITING' }
  | { type: 'PROCESSING' }
  | { type: 'SUCCESS' }
  | { type: 'ERROR'; error?: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export interface SyncContext {
  currentGroup?: string;
  progress: number;
  error?: string;
  retryCount: number;
  lastUpdate?: number;
}
