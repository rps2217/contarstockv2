/**
 * Sync Realtime Constants
 * Constantes y tipos para sincronización en tiempo real
 */

/** Constantes de reconexión */
export const RECONNECT_BASE_DELAY = 1000;
export const RECONNECT_MAX_DELAY = 30000;
export const DEBOUNCE_DELAY = 500;

/** Estado de realtime sync */
export interface RealtimeState {
  isConnected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  pendingChanges: Map<string, Record<string, unknown>[]>;
  debounceTimers: Map<string, NodeJS.Timeout>;
}

/** Crea el estado inicial de realtime */
export function createRealtimeState(): RealtimeState {
  return {
    isConnected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    pendingChanges: new Map(),
    debounceTimers: new Map(),
  };
}

/** Calcula el delay exponencial para reconexión */
export function calculateReconnectDelay(attempts: number): number {
  return Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempts), RECONNECT_MAX_DELAY);
}

/** Tipo para payload de realtime de Supabase */
export interface RealtimePayload {
  table?: string;
  eventType?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

/** Tipo para cambio de realtime */
export interface RealtimeChange {
  eventType: string;
  newRecord?: SyncableRecord;
  oldRecord?: SyncableRecord;
}

/** Registro sincronizable */
export interface SyncableRecord {
  id?: number | string;
  syncStatus?: string;
  created_at?: string | number;
  updated_at?: string | number;
  [key: string]: unknown;
}
