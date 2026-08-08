/**
 * Sync Realtime Handlers
 * Handlers para eventos de sincronización en tiempo real
 */

import { telemetry } from '@/services/analytics/telemetryService';
import { logger } from '@/services/logger';
import type { RealtimeState } from './syncRealtimeConstants';
import { calculateReconnectDelay } from './syncRealtimeConstants';
import type { SyncEventPayload, SyncEventType } from './types';

/** Resultado del handler de status */
export interface RealtimeStatusResult {
  isConnected: boolean;
  shouldReconnect: boolean;
}

/**
 * Procesa el status de conexión realtime
 */
export function handleRealtimeStatusChange(
  status: string,
  realtimeState: RealtimeState,
  emitEvent: (payload: SyncEventPayload) => void
): RealtimeStatusResult {
  switch (status) {
    case 'SUBSCRIBED':
      realtimeState.isConnected = true;
      realtimeState.reconnectAttempts = 0;
      realtimeState.lastHeartbeat = Date.now();
      logger.success('REALTIME', 'Connected successfully');
      telemetry.track('SYNC', 'REALTIME_CONNECTED');
      emitEvent({
        type: 'sync_complete' as SyncEventType,
        timestamp: Date.now(),
        metadata: { eventType: 'realtime_connected' },
      });
      return { isConnected: true, shouldReconnect: false };

    case 'CLOSED':
    case 'CHANNEL_ERROR':
      realtimeState.isConnected = false;
      logger.warn('REALTIME', `Connection status: ${status}`);
      return { isConnected: false, shouldReconnect: true };

    case 'TIMED_OUT':
      realtimeState.isConnected = false;
      logger.warn('REALTIME', 'Connection timed out');
      return { isConnected: false, shouldReconnect: true };

    default:
      return { isConnected: realtimeState.isConnected, shouldReconnect: false };
  }
}

/**
 * Programa una reconexión con backoff exponencial
 */
export function scheduleReconnect(
  enableRealtime: boolean,
  realtimeState: RealtimeState,
  stopFn: () => void,
  connectFn: () => void
): void {
  if (!enableRealtime) return;

  const attempts = realtimeState.reconnectAttempts;
  const delay = calculateReconnectDelay(attempts);

  logger.info('REALTIME', `Scheduling reconnect in ${delay}ms (attempt ${attempts + 1})`);

  setTimeout(() => {
    realtimeState.reconnectAttempts++;
    stopFn();
    connectFn();
  }, delay);
}
