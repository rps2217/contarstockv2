/**
 * Tipos para la FSM de sincronizacion
 * Define los estados, eventos y contexto del sync
 */

/** Estados de la maquina de sync */
export type SyncState = 
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'waiting'
  | 'processing'
  | 'success'
  | 'error'
  | 'retrying';

/** Eventos que disparan transiciones */
export type SyncEvent =
  | { type: 'START_SYNC' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'BATCH_COMPLETE' }
  | { type: 'NETWORK_ERROR'; error: string }
  | { type: 'TIMEOUT' };

/** Contexto de la sincronizacion en curso */
export interface SyncContext {
  /** Grupo de uploads actual */
  currentGroup?: UploadGroup;
  /** Elementos pendientes */
  pendingCount: number;
  /** Elementos procesados */
  processedCount: number;
  /** Errores encontrados */
  errors: SyncError[];
  /** Inicio del sync actual */
  startTime?: number;
  /** Ultimo error */
  lastError?: string;
  /** Intentos de reintento */
  retryCount: number;
}

/** Grupo de elementos a sincronizar */
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

/** Error de sincronizacion */
export interface SyncError {
  table: string;
  message: string;
  timestamp: number;
  retryable: boolean;
}

/** Resultado de una sincronizacion */
export interface SyncResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  durationMs: number;
  errors: SyncError[];
}

/** Configuracion de la FSM */
export interface FSMConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  timeoutMs: number;
}

/** Estado y contexto combinados */
export interface FSMState {
  state: SyncState;
  context: SyncContext;
}
