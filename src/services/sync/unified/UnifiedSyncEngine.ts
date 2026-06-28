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
  type ConflictStrategy,
  DEFAULT_SYNC_CONFIG,
  type ConflictResolution,
} from './types';
import { syncRegistry } from './registry';

// =============================================================================
// HELPERS UTILITARIOS
// =============================================================================

/**
 * Formatea errores para salida legible
 */
const formatError = (e: unknown): string => {
  if (!e) return 'Error desconocido';
  if (typeof e === 'object' && (e as Error).message) {
    return (e as Error).message;
  }
  return String(e);
};

/**
 * Extrae nombre de columna de mensajes de error de Supabase
 */
const extractColumnNameFromError = (errMsg: string): string | null => {
  if (!errMsg) return null;
  const match = errMsg.match(/column\s+['"](.*?)['"]/i) ||
                errMsg.match(/column\s+([\w_]+)\s+does\s+not/i);
  return match ? match[1] : null;
};

/**
 * Normaliza datos para Supabase (sanitización)
 */
const sanitizeData = <T extends object>(data: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    result[key] = value instanceof Date
      ? value.toISOString()
      : typeof value === 'object' && value !== null
        ? JSON.parse(JSON.stringify(value))
        : value;
  });
  return result;
};

// =============================================================================
// MOTOR UNIFICADO
// =============================================================================

export class UnifiedSyncEngine {
  private listeners: Set<SyncEventListener> = new Set();
  private state: SyncState = 'idle';
  private config: Required<SyncEngineConfig>;
  private realtimeSubscription: { unsubscribe: () => void } | null = null;
  private isProcessingQueue = false;
  
  // Métricas
  private lastSyncAt: number | null = null;
  private lastSyncDuration = 0;
  private totalSynced = 0;
  private totalErrors = 0;

  constructor(config: Partial<SyncEngineConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
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
      } catch (e) {
        console.error('[UnifiedSyncEngine] Listener error:', e);
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
    const transitions: Record<SyncState, SyncEvent[]> = {
      idle: ['SYNC_CATALOGS', 'SYNC_BATCHES', 'SYNC_ALL', 'OFFLINE'],
      syncing_catalogs: ['ERROR', 'RESET'],
      syncing_batches: ['ERROR', 'RESET'],
      checking_conflicts: ['ERROR', 'RESET', 'RESOLVE_CONFLICTS'],
      resolving_conflicts: ['ERROR', 'RESET'],
      error: ['SYNC_ALL', 'RESET'],
      offline: ['SYNC_ALL', 'RESET'],
    };
    return transitions[this.state]?.includes(event) ?? false;
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
      const conflicts = await this.checkConflicts();
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
    } catch (error) {
      this.setState('error');
      this.totalErrors++;
      const errorMsg = formatError(error);
      this.emit({ type: 'sync_error', error: errorMsg, timestamp: Date.now() });
      telemetry.track('ERROR', 'SYNC_FAILED', { error: errorMsg });
      return { success: false, errors: [errorMsg] };
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
    if (this.isProcessingQueue) {
      return { processed: 0, failed: 0, remaining: 0, processedIds: [], errors: {} };
    }

    this.isProcessingQueue = true;
    let processed = 0;
    let failed = 0;
    const processedIds: number[] = [];
    const errors: Record<number, string> = {};

    try {
      while (processed + failed < this.config.batchSize) {
        const item = await this.dequeueItem();
        if (!item) break;

        try {
          await this.processQueueItem(item);
          processedIds.push(item.id!);
          processed++;
          this.emit({ type: 'item_removed', tableName: item.tableName, recordId: item.recordId, timestamp: Date.now() });
        } catch (error) {
          errors[item.id!] = formatError(error);
          failed++;
          this.emit({ type: 'item_failed', tableName: item.tableName, recordId: item.recordId, error: formatError(error), timestamp: Date.now() });
          
          // Retry logic
          if (item.retries < this.config.maxRetries) {
            await this.retryItem(item.id!, formatError(error));
            this.emit({ type: 'item_retry', tableName: item.tableName, recordId: item.recordId, timestamp: Date.now() });
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }

    const remaining = await this.getQueueSize();
    return { processed, failed, remaining, processedIds, errors };
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
      this.emit({ type: 'item_removed', tableName: item.tableName, recordId: item.recordId, timestamp: Date.now() });
      this.emit({ type: 'item_added', tableName: item.tableName, recordId: item.recordId, timestamp: Date.now() });
      return existing.id!;
    }

    const newItem: QueuedSyncItem = {
      ...item,
      timestamp: Date.now(),
      retries: 0,
      priority: item.priority ?? 'normal',
    };

    const id = await db.syncQueue.add(newItem) as number;
    this.emit({ type: 'item_added', tableName: item.tableName, recordId: item.recordId, timestamp: Date.now() });
    logger.info('SYNC_QUEUE', `Enqueued: ${item.tableName}/${item.recordId}`);
    
    return id;
  }

  /**
   * Push de un registro individual
   */
  async pushSingle(tableName: string, data: Record<string, unknown>): Promise<SyncResult> {
    const meta = syncRegistry[tableName];
    if (!meta) return { success: false, errors: ['Unknown table'] };

    try {
      const remoteData = meta.mapToRemote ? meta.mapToRemote(data) : data;
      const sanitized = sanitizeData(remoteData);
      
      const { error } = await supabase.from(meta.remoteTable).upsert(sanitized);
      
      if (error) {
        return { success: false, errors: [error.message] };
      }

      return { success: true, uploaded: 1 };
    } catch (error) {
      return { success: false, errors: [formatError(error)] };
    }
  }

  /**
   * Push de un lote de registros
   */
  async pushBatch(tableName: string, rows: Record<string, unknown>[]): Promise<SyncResult> {
    if (!navigator.onLine) {
      return { success: false, errors: ['Offline'] };
    }

    const meta = syncRegistry[tableName];
    if (!meta) return { success: false, errors: ['Unknown table'] };

    const sanitizedRows = rows.map(row => {
      const remote = meta.mapToRemote ? meta.mapToRemote(row) : row;
      const clean: Record<string, unknown> = {};
      Object.entries(sanitizeData(remote)).forEach(([k, v]) => {
        if (!['syncStatus', 'syncError', 'nextRetry', 'retryCount'].includes(k)) {
          clean[k] = v;
        }
      });
      return clean;
    });

    let attempts = 0;
    let currentRows = sanitizedRows;

    while (attempts < 12) {
      try {
        const { error, count } = await supabase
          .from(meta.remoteTable)
          .upsert(currentRows, { onConflict: meta.primaryKey });

        if (error) {
          const errMsg = error.message || '';
          const missingCol = extractColumnNameFromError(errMsg);

          if (missingCol && errMsg.includes('column')) {
            logger.info('SYNC_RESILIENCE', `Removing missing column '${missingCol}'`);
            currentRows = currentRows.map(row => {
              const r = { ...row };
              delete r[missingCol];
              return r;
            });
            attempts++;
            continue;
          }
          return { success: false, errors: [errMsg] };
        }

        return { success: true, uploaded: count || rows.length };
      } catch (error) {
        return { success: false, errors: [formatError(error)] };
      }
    }

    return { success: false, errors: ['Max retries exceeded'] };
  }

  // ===========================================================================
  // PULL OPERATIONS
  // ===========================================================================

  /**
   * Pull de registros desde Supabase
   */
  async pullTable(tableName: string, since?: string): Promise<TableSyncResult> {
    const startTime = performance.now();
    const meta = syncRegistry[tableName];
    
    if (!meta) {
      return { tableName, added: 0, updated: 0, deleted: 0, errors: ['Unknown table'], duration: 0 };
    }

    let query = supabase.from(meta.remoteTable).select('*');
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;
    
    if (error) {
      return { tableName, added: 0, updated: 0, deleted: 0, errors: [error.message], duration: performance.now() - startTime };
    }

    let added = 0, updated = 0;
    const localTable = (db as any)[meta.localTable];

    if (meta.isDynamic) {
      // Tablas dinámicas: usar dynamic_data
      for (const row of data || []) {
        const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
        if (local) {
          await db.dynamic_data.put(local as any);
          added++;
        }
      }
    } else if (localTable) {
      // Tablas normales
      for (const row of data || []) {
        const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
        if (local) {
          await localTable.put(local as any);
          updated++;
        }
      }
    }

    return {
      tableName,
      added,
      updated,
      deleted: 0,
      errors: [],
      duration: performance.now() - startTime,
    };
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
    const localTable = (db as any)[meta.localTable];
    if (!localTable) return;

    // Get dirty items
    let dirtyItems: any[] = [];
    
    if (meta.isDynamic) {
      const pending = await db.dynamic_data
        .where({ tableName: meta.filterValue, syncStatus: 'pending' })
        .toArray();
      const errors = await db.dynamic_data
        .where({ tableName: meta.filterValue, syncStatus: 'error' })
        .toArray();
      dirtyItems = [...pending, ...errors];
    } else {
      const pending = await localTable.where('syncStatus').equals('pending').toArray();
      const errors = await localTable.where('syncStatus').equals('error').toArray();
      dirtyItems = [...pending, ...errors];
    }

    if (!dirtyItems.length) return;

    // Process in batches
    for (let i = 0; i < dirtyItems.length; i += this.config.batchSize) {
      const chunk = dirtyItems.slice(i, i + this.config.batchSize);
      const rows = chunk.map(item => meta.mapToRemote ? meta.mapToRemote(item) : item);
      
      const result = await this.pushBatch(meta.remoteTable, rows);
      
      if (result.success) {
        // Mark as synced
        await db.transaction('rw', localTable, async () => {
          for (const item of chunk) {
            const id = item[meta.primaryKey] || item.id;
            await localTable.update(id, {
              syncStatus: 'synced',
              lastSyncTimestamp: Date.now(),
            });
          }
        });
      }
    }
  }

  private async dequeueItem(): Promise<QueuedSyncItem | null> {
    const items = await db.syncQueue.orderBy('timestamp').toArray();
    
    // Apply backoff for items with recent retries
    const now = Date.now();
    for (const item of items) {
      if (item.retries > 0) {
        const delay = this.config.baseDelayMs * Math.pow(2, item.retries - 1);
        const nextRetry = item.timestamp + delay;
        if (now < nextRetry) continue;
      }
      return item;
    }
    
    return items[0] || null;
  }

  private async processQueueItem(item: QueuedSyncItem): Promise<void> {
    const meta = syncRegistry[item.tableName];
    if (!meta) throw new Error(`Unknown table: ${item.tableName}`);

    let result: SyncResult;

    switch (item.operation) {
      case 'delete':
        const { error } = await supabase.from(meta.remoteTable).delete().eq(meta.primaryKey, item.recordId);
        if (error) throw error;
        break;

      case 'create':
      case 'update':
        const remoteData = meta.mapToRemote ? meta.mapToRemote(item.data) : item.data;
        const { error: upsertError } = await supabase
          .from(meta.remoteTable)
          .upsert(sanitizeData(remoteData), { onConflict: meta.primaryKey });
        if (upsertError) throw upsertError;
        break;
    }

    // Remove from queue on success
    await db.syncQueue.delete(item.id!);
  }

  private async retryItem(id: number, error: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (!item) return;

    const newRetries = item.retries + 1;
    if (newRetries >= this.config.maxRetries) {
      await db.syncQueue.delete(id);
      telemetry.track('SYNC', 'MAX_RETRIES_EXCEEDED', { table: item.tableName, recordId: item.recordId });
      return;
    }

    await db.syncQueue.update(id, {
      retries: newRetries,
      lastError: error,
    });
  }

  private async checkConflicts(): Promise<SyncConflict[]> {
    // Simplified conflict detection
    return [];
  }

  private async resolveConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      this.emit({ type: 'conflict_resolved', conflict, timestamp: Date.now() });
    }
  }

  // ===========================================================================
  // REAL-TIME SYNC
  // ===========================================================================

  /**
   * Inicia sincronización en tiempo real
   */
  startRealtimeSync(): void {
    if (!this.config.enableRealtime || this.realtimeSubscription) return;

    this.realtimeSubscription = supabase
      .channel('sync-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        logger.info('REALTIME', `Change detected: ${payload.table}`, payload.eventType);
        this.handleRealtimeChange(payload);
      })
      .subscribe();
  }

  /**
   * Detiene sincronización en tiempo real
   */
  stopRealtimeSync(): void {
    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = null;
  }

  private async handleRealtimeChange(payload: any): Promise<void> {
    const tableName = payload.table;
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    if (['INSERT', 'UPDATE'].includes(eventType) && newRecord) {
      await this.pullTable(tableName);
    } else if (eventType === 'DELETE' && oldRecord) {
      const meta = syncRegistry[tableName];
      if (meta) {
        const localTable = (db as any)[meta.localTable];
        await localTable?.delete(oldRecord[meta.primaryKey]);
      }
    }

    this.emit({
      type: 'sync_complete',
      tableName,
      timestamp: Date.now(),
      metadata: { eventType },
    });
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
    return db.syncQueue.count();
  }

  async clearQueue(): Promise<void> {
    await db.syncQueue.clear();
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
// ===========================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ===========================================================================

/**
 * Realiza upload de un grupo de datos (compatibilidad legacy)
 */
export async function uploadBatch(
  group: { type: string; data: Record<string, unknown>[] },
  onProgress?: (message: string) => void
): Promise<{ success: boolean; uploaded: number }> {
  const tableName = mapGroupTypeToTable(group.type);
  onProgress?.(`Iniciando upload a ${tableName}...`);
  const result = await unifiedSyncEngine.pushBatch(tableName, group.data);
  if (result.success) {
    onProgress?.(`Upload completado: ${result.uploaded} registros`);
  } else {
    onProgress?.(`Error: ${result.errors?.join(', ')}`);
  }
  return {
    success: result.success,
    uploaded: result.uploaded || 0,
  };
}

/**
 * Upload un grupo legacy (UploadGroup) con datos preparados
 */
export async function uploadGroupLegacy(
  erpOrder: string,
  type: string,
  data: Record<string, unknown>[]
): Promise<{ success: boolean; uploaded: number }> {
  return uploadBatch({ type, data });
}

/**
 * Resetea el lock de sincronización (compatibilidad legacy)
 */
export function resetSyncLock(): void {
  logger.info('SYNC', 'Sync lock reset (no-op in unified engine)');
}

function mapGroupTypeToTable(type: string): string {
  const mapping: Record<string, string> = {
    'INVENTARIO': 'INVENTARIO',
    'RECEPCION': 'RECEPCION',
    'VENCIMIENTOS': 'VENCIMIENTOS',
    'EVENTOS': 'EVENTOS',
    'AUDIT_LOGS': 'AUDIT_LOGS',
  };
  return mapping[type] || type;
}
