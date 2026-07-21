/**
 * =============================================================================
 * UNIFIED SYNC ENGINE - Motor de Sincronización Unificado
 * =============================================================================
 *
 * Combina la funcionalidad de:
 * - GenericSyncEngine: Sync de catálogos
 * - BatchSyncService: Operaciones batch con Supabase
 * - RealtimeSyncService: Suscripciones en tiempo real
 * - SyncQueueService: Cola offline con retry
 *
 * En una sola clase coherente con FSM integrado.
 *
 * @module unified/UnifiedSyncEngine
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/db';
import { logger } from '@/services/logger';
import { telemetry } from '@/services/analytics/telemetryService';
import { useSyncStore } from '@/stores';
import { getSettings } from '@/services/settings';
import {
  type SyncResult,
  type TableSyncResult,
  type SyncState,
  type SyncEvent,
  type QueuedSyncItem,
  type QueueProcessResult,
  type SyncStats,
  type SyncEngineConfig,
  type TableSyncMeta,
  type SyncConflict,
  type SyncEventPayload,
  type SyncEventListener,
  type SyncEventType,
  type ConflictStrategy,
  DEFAULT_SYNC_CONFIG,
  type ConflictResolution,
} from './types';
import { syncRegistry } from './registry';
import { syncMetricsService } from './SyncMetricsService';
import { SyncConflictResolver, getSyncConflictResolver } from './SyncConflictResolver';

// =============================================================================
// HELPERS UTILITARIOS (importados de syncHelpers)
// =============================================================================

import { formatError, extractColumnNameFromError, sanitizeData } from './syncHelpers';
import { processSyncQueue } from './syncQueueProcessor';
import { getDirtyItems, processDeletions, markAsSynced } from './syncTableOperations';

// Tipo para acceso dinámico a tablas Dexie
type DexieTable = {
  get: (id: unknown) => Promise<unknown>;
  put: (item: unknown) => Promise<unknown>;
  add: (item: unknown) => Promise<unknown>;
  update: (id: unknown, changes: unknown) => Promise<number>;
  delete: (id: unknown) => Promise<void>;
  toArray: () => Promise<Record<string, unknown>[]>;
  where: (field: string) => {
    equals: (value: unknown) => { toArray: () => Promise<Record<string, unknown>[]> };
    anyOf: (values: unknown[]) => { toArray: () => Promise<Record<string, unknown>[]> };
  };
};

// Los tipos SyncableRecord, RealtimePayload y RealtimeChange se importan de syncRealtimeConstants
import {
  processRemoteEvents,
  processDynamicData,
  processGenericTable,
  pullTable,
} from './syncEventPuller';
import { checkConflicts, resolveConflicts } from './syncConflictChecker';
import {
  createRealtimeState,
  calculateReconnectDelay,
  type RealtimeState,
  type RealtimePayload,
  type SyncableRecord,
  RECONNECT_BASE_DELAY,
  RECONNECT_MAX_DELAY,
  DEBOUNCE_DELAY,
} from './syncRealtimeConstants';
import { executeBatchUpsert, executeSingleUpsert, recordSyncMetric } from './syncBatchOperations';
import { pushEventsChanges, pushGenericChanges, retryQueueItem } from './syncPushOperations';
import { handleRealtimeStatusChange, scheduleReconnect } from './syncRealtimeHandlers';
import {
  getQueueSize,
  clearSyncQueue,
  canFSMTransition,
  getRealtimeStats,
} from './syncStatsHelpers';

// =============================================================================
// MOTOR UNIFICADO
// =============================================================================

export class UnifiedSyncEngine {
  private listeners: Set<SyncEventListener> = new Set();
  private state: SyncState = 'idle';
  private config: Required<SyncEngineConfig>;
  private realtimeSubscription: { unsubscribe: () => void } | null = null;
  private isProcessingQueue = false;
  private conflictResolver: SyncConflictResolver;

  // Métricas
  private lastSyncAt: number | null = null;
  private lastSyncDuration = 0;
  private totalSynced = 0;
  private totalErrors = 0;

  // Telemetry wrapper for compatibility
  private telemetryTracker = {
    track: (category: string, event: string, data?: Record<string, unknown>) => {
      telemetry.track(category as 'SYNC' | 'ERROR', event, data);
    },
  };

  constructor(config: Partial<SyncEngineConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.conflictResolver = getSyncConflictResolver();
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Suscribe a eventos de sincronización
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(payload: SyncEventPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (e: unknown) {
        logger.error(
          'UnifiedSyncEngine',
          'Listener error',
          e instanceof Error ? e.message : String(e)
        );
      }
    });
  }

  // ===========================================================================
  // STATE MANAGEMENT (FSM)
  // ===========================================================================

  private setState(newState: SyncState): void {
    const prevState = this.state;
    this.state = newState;
    this.emit({
      type: 'state_change',
      state: newState,
      timestamp: Date.now(),
      metadata: { previousState: prevState },
    });
  }

  getState(): SyncState {
    return this.state;
  }

  private canTransition(event: SyncEvent): boolean {
    return canFSMTransition(this.state, event);
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Sincronización completa (catálogos + batches)
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = performance.now();

    if (!navigator.onLine) {
      this.setState('offline');
      recordSyncMetric({
        operation: 'sync_all',
        tableName: '_system',
        duration: 0,
        success: false,
        recordsAffected: 0,
        error: 'Offline',
      });
      return { success: false, errors: ['Offline'] };
    }

    this.setState('syncing_catalogs');
    this.emit({ type: 'sync_start', timestamp: Date.now() });

    try {
      // 1. Sync catálogos
      const catalogResult = await this.syncCatalogs();

      // 2. Sync batches
      this.setState('syncing_batches');
      const batchResult = await this.syncBatches();

      // 3. Check conflicts
      this.setState('checking_conflicts');
      const conflictStart = performance.now();
      const conflicts = await this.checkConflicts();
      recordSyncMetric({
        operation: 'conflict_check',
        tableName: '_all',
        duration: performance.now() - conflictStart,
        success: true,
        recordsAffected: conflicts.length,
      });

      if (conflicts.length > 0) {
        this.setState('resolving_conflicts');
        await this.resolveConflicts(conflicts);
      }

      const duration = performance.now() - startTime;
      this.lastSyncAt = Date.now();
      this.lastSyncDuration = duration;
      this.totalSynced += (catalogResult.uploaded || 0) + (batchResult.uploaded || 0);

      this.setState('idle');
      this.emit({ type: 'sync_complete', timestamp: Date.now(), metadata: { duration } });

      telemetry.track('SYNC', 'FULL_SYNC', {
        uploaded: (catalogResult.uploaded || 0) + (batchResult.uploaded || 0),
        downloaded: catalogResult.downloaded,
        duration,
      });

      return {
        success: true,
        uploaded: (catalogResult.uploaded || 0) + (batchResult.uploaded || 0),
        downloaded: catalogResult.downloaded,
        lastSyncAt: this.lastSyncAt,
      };
    } catch (error: unknown) {
      this.setState('error');
      this.totalErrors++;
      const errorMsg = formatError(error);
      this.emit({ type: 'sync_error', error: errorMsg, timestamp: Date.now() });
      telemetry.track('ERROR', 'SYNC_FAILED', { error: errorMsg });

      recordSyncMetric({
        operation: 'sync_all',
        tableName: '_system',
        duration: performance.now() - startTime,
        success: false,
        recordsAffected: 0,
        error: errorMsg,
      });

      return { success: false, errors: [errorMsg] };
    }
  }

  /**
   * Sincroniza una tabla específica por su registry key.
   * Compatibilidad con GenericSyncEngine.sync(key)
   */
  async sync(registryKey: string): Promise<{ success: boolean; errors: string[] }> {
    const meta = syncRegistry[registryKey];
    if (!meta) {
      return { success: false, errors: [`Registry key ${registryKey} not found`] };
    }

    try {
      const result = await this.syncTable(registryKey);
      return {
        success: result.errors.length === 0,
        errors: result.errors,
      };
    } catch (error: unknown) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Sincroniza solo catálogos (productos, proveedores)
   */
  async syncCatalogs(): Promise<SyncResult> {
    const results: TableSyncResult[] = [];

    for (const tableName of this.config.tables) {
      const meta = syncRegistry[tableName];
      if (!meta || meta.optional) continue;

      const tableResult = await this.syncTable(tableName);
      results.push(tableResult);
    }

    return {
      success: results.every(r => r.errors.length === 0),
      uploaded: results.reduce((sum, r) => sum + r.updated + r.added, 0),
      downloaded: results.reduce((sum, r) => sum + r.added + r.updated, 0),
      deleted: results.reduce((sum, r) => sum + r.deleted, 0),
      errors: results.flatMap(r => r.errors),
    };
  }

  /**
   * Sincroniza batches pendientes (cola offline)
   */
  async syncBatches(): Promise<SyncResult> {
    const result = await this.processQueue();

    return {
      success: result.failed === 0,
      uploaded: result.processed,
      errors: Object.values(result.errors),
    };
  }

  /**
   * Procesa la cola de sincronización
   */
  async processQueue(): Promise<QueueProcessResult> {
    const result = await processSyncQueue(this.config, {
      isProcessingQueue: { current: this.isProcessingQueue },
      emit: (event: {
        type: string;
        tableName?: string;
        recordId?: string;
        error?: string;
        timestamp: number;
      }) => {
        // Re-emit as full SyncEventPayload
        this.emit({
          ...event,
          type: event.type as SyncEventType,
        });
      },
    });
    this.isProcessingQueue = false;
    return result;
  }

  // ===========================================================================
  // PUSH OPERATIONS
  // ===========================================================================

  /**
   * Encola un cambio para sincronización
   */
  async enqueue(item: Omit<QueuedSyncItem, 'id' | 'timestamp' | 'retries'>): Promise<number> {
    const existing = await db.syncQueue
      .where({ tableName: item.tableName, recordId: item.recordId })
      .first();

    if (existing) {
      // Deduplicación: DELETE sobrescribe todo, UPDATE sobrescribe INSERT/UPDATE
      if (existing.operation === 'delete' || item.operation === 'delete') {
        await db.syncQueue.update(existing.id!, {
          operation: 'delete',
          data: item.data,
          timestamp: Date.now(),
          retries: 0,
          lastError: undefined,
        });
      } else {
        await db.syncQueue.update(existing.id!, {
          operation: item.operation,
          data: item.data,
          timestamp: Date.now(),
          retries: 0,
          lastError: undefined,
        });
      }
      this.emit({
        type: 'item_removed',
        tableName: item.tableName,
        recordId: item.recordId,
        timestamp: Date.now(),
      });
      this.emit({
        type: 'item_added',
        tableName: item.tableName,
        recordId: item.recordId,
        timestamp: Date.now(),
      });
      return existing.id!;
    }

    const newItem: QueuedSyncItem = {
      ...item,
      timestamp: Date.now(),
      retries: 0,
      priority: item.priority ?? 'normal',
    };

    const id = (await db.syncQueue.add(newItem)) as number;
    this.emit({
      type: 'item_added',
      tableName: item.tableName,
      recordId: item.recordId,
      timestamp: Date.now(),
    });
    logger.info('SYNC_QUEUE', `Enqueued: ${item.tableName}/${item.recordId}`);

    return id;
  }

  /**
   * Push de un registro individual
   */
  async pushSingle(tableName: string, data: Record<string, unknown>): Promise<SyncResult> {
    if (!navigator.onLine) {
      return { success: false, errors: ['Offline'] };
    }
    return executeSingleUpsert(tableName, data);
  }

  /**
   * Push de un lote de registros
   */
  async pushBatch(tableName: string, rows: Record<string, unknown>[]): Promise<SyncResult> {
    if (!navigator.onLine) {
      recordSyncMetric({
        operation: 'batch_push',
        tableName,
        duration: 0,
        success: false,
        recordsAffected: rows.length,
        error: 'Offline',
      });
      return { success: false, errors: ['Offline'] };
    }

    const meta = syncRegistry[tableName];
    return executeBatchUpsert(tableName, rows, {
      mapToRemote: meta?.mapToRemote,
      primaryKey: meta?.primaryKey,
    });
  }

  // ===========================================================================
  // PULL OPERATIONS
  // ===========================================================================

  /**
   * Pull de registros desde Supabase
   */
  async pullTable(tableName: string, _since?: string): Promise<TableSyncResult> {
    return pullTable(tableName);
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async syncTable(tableName: string): Promise<TableSyncResult> {
    const meta = syncRegistry[tableName];
    if (!meta) {
      return { tableName, added: 0, updated: 0, deleted: 0, errors: ['Not found'], duration: 0 };
    }

    // 1. Push local changes
    await this.pushTableChanges(tableName, meta);

    // 2. Pull remote changes
    const pullResult = await this.pullTable(tableName);

    return pullResult;
  }

  private async pushTableChanges(tableName: string, meta: TableSyncMeta): Promise<void> {
    const localTable = db[meta.localTable] as DexieTable;
    if (!localTable) return;

    const { dirtyItems, toDelete } = await getDirtyItems(tableName, meta);
    await processDeletions(meta, toDelete);

    if (!dirtyItems.length) return;

    // Push changes using helper functions
    if (tableName === 'events' || meta.filterValue === 'EVENTOS') {
      await pushEventsChanges(localTable, meta, dirtyItems, (t, r) => this.pushBatch(t, r));
    } else {
      await pushGenericChanges(localTable, meta, dirtyItems, this.config.batchSize, (t, r) =>
        this.pushBatch(t, r)
      );
    }
  }

  private async retryItem(id: number, error: string): Promise<void> {
    await retryQueueItem(id, this.config.maxRetries, this.telemetryTracker);
  }

  private async checkConflicts(): Promise<SyncConflict[]> {
    return checkConflicts(conflict => {
      this.emit({
        type: 'conflict_detected',
        conflict,
        tableName: conflict.tableName,
        recordId: conflict.recordId,
        timestamp: conflict.detectedAt,
      });
    });
  }

  /**
   * Resuelve conflictos usando la estrategia configurada
   */
  private async resolveConflicts(
    conflicts: SyncConflict[],
    strategy: ConflictStrategy = {
      type: this.config.autoResolveConflicts ? 'local_wins' : 'manual',
    }
  ): Promise<{ resolved: number; failed: number }> {
    return resolveConflicts(
      conflicts,
      strategy,
      (conflict, s) => this.resolveSingleConflict(conflict, s),
      (conflict, resolution) => {
        this.emit({
          type: 'conflict_resolved',
          conflict,
          tableName: conflict.tableName,
          recordId: conflict.recordId,
          timestamp: Date.now(),
          metadata: { resolution },
        });
      }
    );
  }

  /**
   * Resuelve un conflicto individual (delegado al ConflictResolver)
   */
  private async resolveSingleConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy
  ): Promise<boolean> {
    return this.conflictResolver.resolveConflict(conflict, strategy);
  }

  /**
   * Merge dos registros en conflicto (delegado al ConflictResolver)
   */
  private mergeConflictRecords(local: unknown, remote: unknown): Record<string, unknown> {
    return this.conflictResolver.mergeRecords(local, remote);
  }

  /**
   * Resuelve un conflicto manualmente (para uso desde UI)
   */
  async resolveConflictManually(
    tableName: string,
    recordId: string,
    resolution: ConflictResolution,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    return this.conflictResolver.resolveManually(tableName, recordId, resolution, mergedData);
  }

  /**
   * Obtiene conflictos pendientes
   */
  async getPendingConflicts(): Promise<SyncConflict[]> {
    return this.checkConflicts();
  }

  // ===========================================================================
  // REAL-TIME SYNC OPTIMIZADO
  // ===========================================================================

  private realtimeState: {
    isConnected: boolean;
    lastHeartbeat: number;
    reconnectAttempts: number;
    pendingChanges: Map<string, SyncableRecord[]>;
    debounceTimers: Map<string, NodeJS.Timeout>;
  } = {
    isConnected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    pendingChanges: new Map(),
    debounceTimers: new Map(),
  };

  /**
   * Inicia sincronización en tiempo real con reconexión automática
   */
  startRealtimeSync(): void {
    if (!this.config.enableRealtime) {
      logger.info('REALTIME', 'Realtime sync disabled in config');
      return;
    }

    if (this.realtimeSubscription) {
      logger.info('REALTIME', 'Already subscribed');
      return;
    }

    this.connectRealtime();
  }

  private connectRealtime(): void {
    const channelName = `sync-realtime-${Date.now()}`;

    try {
      this.realtimeSubscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          this.handleRealtimeChange.bind(this)
        )
        .on('system', { event: 'sync' }, () => {
          this.realtimeState.lastHeartbeat = Date.now();
        })
        .subscribe(status => {
          this.handleRealtimeStatus(status);
        });

      logger.info('REALTIME', `Connecting to channel: ${channelName}`);
    } catch (error: unknown) {
      logger.error('REALTIME', 'Failed to connect', formatError(error));
      scheduleReconnect(
        this.config.enableRealtime,
        this.realtimeState,
        () => this.stopRealtimeSync(),
        () => this.connectRealtime()
      );
    }
  }

  private handleRealtimeStatus(status: string): void {
    const result = handleRealtimeStatusChange(status, this.realtimeState, payload =>
      this.emit(payload)
    );
    if (result.shouldReconnect) {
      scheduleReconnect(
        this.config.enableRealtime,
        this.realtimeState,
        () => this.stopRealtimeSync(),
        () => this.connectRealtime()
      );
    }
  }

  /**
   * Detiene sincronización en tiempo real
   */
  stopRealtimeSync(): void {
    // Clear all pending timers
    this.realtimeState.debounceTimers.forEach(timer => clearTimeout(timer));
    this.realtimeState.debounceTimers.clear();
    this.realtimeState.pendingChanges.clear();

    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }

    this.realtimeState.isConnected = false;
    logger.info('REALTIME', 'Disconnected');
    telemetry.track('SYNC', 'REALTIME_DISCONNECTED');
  }

  private handleRealtimeChange = async (payload: RealtimePayload): Promise<void> => {
    const tableName = payload.table;
    const eventType = payload.eventType || 'UNKNOWN';
    const newRecord = payload.new as SyncableRecord | undefined;
    const oldRecord = payload.old as SyncableRecord | undefined;

    if (!tableName) return;

    logger.info('REALTIME', `${eventType} on ${tableName}`);

    // Debounce changes for the same table
    this.debounceRealtimeChange(tableName, { eventType, newRecord, oldRecord });
  };

  private debounceRealtimeChange(
    tableName: string,
    change: { eventType: string; newRecord?: SyncableRecord; oldRecord?: SyncableRecord }
  ): void {
    // Clear existing timer for this table
    const existingTimer = this.realtimeState.debounceTimers.get(tableName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Add to pending changes
    if (!this.realtimeState.pendingChanges.has(tableName)) {
      this.realtimeState.pendingChanges.set(tableName, []);
    }
    this.realtimeState.pendingChanges.get(tableName)!.push(change);

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processPendingChanges(tableName);
    }, DEBOUNCE_DELAY);

    this.realtimeState.debounceTimers.set(tableName, timer);
  }

  private async processPendingChanges(tableName: string): Promise<void> {
    const changes = this.realtimeState.pendingChanges.get(tableName) || [];
    this.realtimeState.pendingChanges.delete(tableName);
    this.realtimeState.debounceTimers.delete(tableName);

    if (changes.length === 0) return;

    const lastChange = changes[changes.length - 1]; // Use latest state
    const eventType = lastChange.eventType;

    try {
      if (['INSERT', 'UPDATE'].includes(eventType as 'INSERT' | 'UPDATE') && lastChange.newRecord) {
        await this.pullTable(tableName);
        telemetry.track('SYNC', 'REALTIME_PULL', { table: tableName, changes: changes.length });
      } else if (eventType === 'DELETE' && lastChange.oldRecord) {
        const meta = syncRegistry[tableName];
        if (meta) {
          const localTable = db[meta.localTable] as DexieTable;
          const recordId = lastChange.oldRecord[meta.primaryKey];
          await localTable?.delete(recordId);
          telemetry.track('SYNC', 'REALTIME_DELETE', { table: tableName });
        }
      }

      this.emit({
        type: 'sync_complete',
        tableName,
        timestamp: Date.now(),
        metadata: { eventType, changesCount: changes.length },
      });
    } catch (error: unknown) {
      logger.error('REALTIME', `Error processing changes for ${tableName}`, formatError(error));
      telemetry.track('ERROR', 'REALTIME_PROCESS_ERROR', {
        table: tableName,
        error: formatError(error),
      });
    }
  }

  /**
   * Obtiene el estado de la conexión realtime
   */
  getRealtimeStatus() {
    return getRealtimeStats(this.realtimeState);
  }

  /**
   * Suscribe a cambios de una tabla específica
   */
  async subscribeToTable(tableName: string): Promise<boolean> {
    const meta = syncRegistry[tableName];
    if (!meta) return false;

    try {
      await this.pullTable(tableName);
      logger.info('REALTIME', `Subscribed to table: ${tableName}`);
      return true;
    } catch (error: unknown) {
      logger.error('REALTIME', `Failed to subscribe to ${tableName}`, formatError(error));
      return false;
    }
  }

  // ===========================================================================
  // STATS & UTILS
  // ===========================================================================

  async getStats(): Promise<SyncStats> {
    return {
      lastSyncAt: this.lastSyncAt,
      lastSyncDuration: this.lastSyncDuration,
      totalSynced: this.totalSynced,
      totalErrors: this.totalErrors,
      pendingItems: await this.getQueueSize(),
      isOnline: navigator.onLine,
      currentState: this.state,
    };
  }

  async getQueueSize(): Promise<number> {
    return getQueueSize();
  }

  async clearQueue(): Promise<void> {
    await clearSyncQueue();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const unifiedSyncEngine = new UnifiedSyncEngine({
  batchSize: 100,
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  enableRealtime: true,
  autoResolveConflicts: false,
});

export default UnifiedSyncEngine;

// Re-export legacy functions for backwards compatibility
export { uploadBatch, uploadGroupLegacy, resetSyncLock } from './syncLegacy';
