/**
 * =============================================================================
 * SYNC REALTIME MANAGER - Gestión de sincronización en tiempo real
 * =============================================================================
 *
 * Maneja conexiones websocket con Supabase para sincronización en tiempo real.
 *
 * @module sync/unified/syncRealtimeManager
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/db';
import { logger } from '@/services/logger';
import { telemetry } from '@/services/analytics/telemetryService';
import { syncRegistry } from './registry';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeState {
  isConnected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  pendingChanges: Map<string, any[]>;
  debounceTimers: Map<string, NodeJS.Timeout>;
}

export interface RealtimeManagerConfig {
  enableRealtime: boolean;
  onSync?: () => Promise<void>;
  onStatusChange?: (status: {
    isConnected: boolean;
    lastHeartbeat: number;
    pendingChanges: number;
  }) => void;
}

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const DEBOUNCE_DELAY = 500;

/**
 * Crea un manager de realtime sync
 */
export function createRealtimeManager(config: RealtimeManagerConfig) {
  let subscription: RealtimeChannel | null = null;
  const state: RealtimeState = {
    isConnected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    pendingChanges: new Map(),
    debounceTimers: new Map(),
  };

  const handleRealtimeStatus = (status: string): void => {
    switch (status) {
      case 'SUBSCRIBED':
        state.isConnected = true;
        state.reconnectAttempts = 0;
        state.lastHeartbeat = Date.now();
        logger.success('REALTIME', 'Connected successfully');
        telemetry.track('SYNC', 'REALTIME_CONNECTED');
        config.onStatusChange?.({
          isConnected: true,
          lastHeartbeat: state.lastHeartbeat,
          pendingChanges: getPendingCount(),
        });
        break;

      case 'CLOSED':
      case 'CHANNEL_ERROR':
        state.isConnected = false;
        logger.warn('REALTIME', `Connection status: ${status}`);
        scheduleReconnect();
        break;

      case 'TIMED_OUT':
        state.isConnected = false;
        logger.warn('REALTIME', 'Connection timed out');
        scheduleReconnect();
        break;
    }
  };

  const handleRealtimeChange = async (payload: any): Promise<void> => {
    const tableName = payload.table;
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    if (!tableName) return;

    logger.info('REALTIME', `${eventType} on ${tableName}`);
    debounceRealtimeChange(tableName, { eventType, newRecord, oldRecord });
  };

  const debounceRealtimeChange = (
    tableName: string,
    change: { eventType: string; newRecord?: any; oldRecord?: any }
  ): void => {
    // Clear existing timer for this table
    const existingTimer = state.debounceTimers.get(tableName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Add to pending changes
    if (!state.pendingChanges.has(tableName)) {
      state.pendingChanges.set(tableName, []);
    }
    state.pendingChanges.get(tableName)!.push(change);

    // Set new debounce timer
    const timer = setTimeout(() => {
      processPendingChanges(tableName);
    }, DEBOUNCE_DELAY);

    state.debounceTimers.set(tableName, timer);
  };

  const processPendingChanges = async (tableName: string): Promise<void> => {
    const changes = state.pendingChanges.get(tableName) || [];
    state.pendingChanges.delete(tableName);
    state.debounceTimers.delete(tableName);

    if (changes.length === 0) return;

    const lastChange = changes[changes.length - 1];
    const eventType = lastChange.eventType;

    try {
      if (['INSERT', 'UPDATE'].includes(eventType) && lastChange.newRecord) {
        config.onSync?.();
        telemetry.track('SYNC', 'REALTIME_PULL', { table: tableName, changes: changes.length });
      } else if (eventType === 'DELETE' && lastChange.oldRecord) {
        const meta = syncRegistry[tableName];
        if (meta) {
          const localTable = (db as any)[meta.localTable];
          await localTable?.delete(lastChange.oldRecord[meta.primaryKey]);
          telemetry.track('SYNC', 'REALTIME_DELETE', { table: tableName });
        }
      }

      config.onStatusChange?.({
        isConnected: state.isConnected,
        lastHeartbeat: state.lastHeartbeat,
        pendingChanges: getPendingCount(),
      });
    } catch (error) {
      logger.error('REALTIME', `Error processing changes for ${tableName}`, error);
      telemetry.track('ERROR', 'REALTIME_PROCESS_ERROR', {
        table: tableName,
        error: String(error),
      });
    }
  };

  const scheduleReconnect = (): void => {
    if (!config.enableRealtime) return;

    const attempts = state.reconnectAttempts;
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempts), RECONNECT_MAX_DELAY);

    logger.info('REALTIME', `Scheduling reconnect in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      state.reconnectAttempts++;
      disconnect();
      connect();
    }, delay);
  };

  const connect = (): void => {
    if (!config.enableRealtime) {
      logger.info('REALTIME', 'Realtime sync disabled in config');
      return;
    }

    if (subscription) {
      logger.info('REALTIME', 'Already subscribed');
      return;
    }

    const channelName = `sync-realtime-${Date.now()}`;

    try {
      subscription = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public' }, handleRealtimeChange)
        .on('system', { event: 'sync' }, () => {
          state.lastHeartbeat = Date.now();
        })
        .subscribe(handleRealtimeStatus);

      logger.info('REALTIME', `Connecting to channel: ${channelName}`);
    } catch (error) {
      logger.error('REALTIME', 'Failed to connect', error);
      scheduleReconnect();
    }
  };

  const disconnect = (): void => {
    // Clear all pending timers
    state.debounceTimers.forEach(timer => clearTimeout(timer));
    state.debounceTimers.clear();
    state.pendingChanges.clear();

    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }

    state.isConnected = false;
    logger.info('REALTIME', 'Disconnected');
    telemetry.track('SYNC', 'REALTIME_DISCONNECTED');
  };

  const getPendingCount = (): number => {
    return Array.from(state.pendingChanges.values()).reduce((sum, arr) => sum + arr.length, 0);
  };

  const getStatus = () => ({
    isConnected: state.isConnected,
    lastHeartbeat: state.lastHeartbeat,
    pendingChanges: getPendingCount(),
  });

  return {
    connect,
    disconnect,
    getStatus,
    getState: () => state,
  };
}

export type SyncRealtimeManager = ReturnType<typeof createRealtimeManager>;
