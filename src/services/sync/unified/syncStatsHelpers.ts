/**
 * Sync Stats Helpers
 * Funciones utilitarias para estadísticas y métricas de sincronización
 */

import { db } from '@/db';
import type { SyncState } from './types';
import type { RealtimeState } from './syncRealtimeConstants';

/**
 * Transiciones válidas de FSM (exportado para compartir con UnifiedSyncEngine)
 */
export const FSM_TRANSITIONS: Record<SyncState, string[]> = {
  idle: ['SYNC_CATALOGS', 'SYNC_BATCHES', 'SYNC_ALL', 'OFFLINE'],
  syncing_catalogs: ['ERROR', 'RESET'],
  syncing_batches: ['ERROR', 'RESET'],
  checking_conflicts: ['ERROR', 'RESET', 'RESOLVE_CONFLICTS'],
  resolving_conflicts: ['ERROR', 'RESET'],
  error: ['SYNC_ALL', 'RESET'],
  offline: ['SYNC_ALL', 'RESET'],
};

/**
 * Obtiene el tamaño de la cola
 */
export async function getQueueSize(): Promise<number> {
  return db.syncQueue.count();
}

/**
 * Limpia la cola de sincronización
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

/**
 * FSM: Valida si una transición de estado es válida
 */
export function canFSMTransition(currentState: SyncState, event: string): boolean {
  return FSM_TRANSITIONS[currentState]?.includes(event) ?? false;
}

/**
 * Obtiene el estado de la conexión realtime
 */
export function getRealtimeStats(realtimeState: RealtimeState): {
  isConnected: boolean;
  lastHeartbeat: number;
  pendingChanges: number;
} {
  return {
    isConnected: realtimeState.isConnected,
    lastHeartbeat: realtimeState.lastHeartbeat,
    pendingChanges: Array.from(realtimeState.pendingChanges.values()).reduce(
      (sum: number, arr: unknown[]) => sum + arr.length,
      0
    ),
  };
}
