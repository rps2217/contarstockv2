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
import { syncMetricsService } from './SyncMetricsService';
import { SyncConflictResolver, getSyncConflictResolver } from './SyncConflictResolver';

// =============================================================================
// HELPERS UTILITARIOS (importados de syncHelpers)
// =============================================================================

import { formatError, extractColumnNameFromError, sanitizeData } from './syncHelpers';
import { processSyncQueue } from './syncQueueProcessor';

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
      } catch (e) {
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
      // @ts-ignore
      syncMetricsService.recordMetric({
        operation: 'conflict_check',
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
      // @ts-ignore
      syncMetricsService.recordMetric({
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
    } catch (error) {
      this.setState('error');
      this.totalErrors++;
      const errorMsg = formatError(error);
      this.emit({ type: 'sync_error', error: errorMsg, timestamp: Date.now() });
      telemetry.track('ERROR', 'SYNC_FAILED', { error: errorMsg });

      // @ts-ignore
      syncMetricsService.recordMetric({
        operation: 'conflict_check',
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
    } catch (error) {
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
      emit: event => this.emit(event as any),
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
    const startTime = performance.now();

    if (!navigator.onLine) {
      // @ts-ignore
      syncMetricsService.recordMetric({
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

          // @ts-ignore
          syncMetricsService.recordMetric({
            operation: 'batch_push',
            tableName,
            duration: performance.now() - startTime,
            success: false,
            recordsAffected: rows.length,
            error: errMsg,
          });
          return { success: false, errors: [errMsg] };
        }

        // @ts-ignore
        syncMetricsService.recordMetric({
          operation: 'batch_push',
          tableName,
          duration: performance.now() - startTime,
          success: true,
          recordsAffected: count || rows.length,
        });
        return { success: true, uploaded: count || rows.length };
      } catch (error) {
        // @ts-ignore
        syncMetricsService.recordMetric({
          operation: 'batch_push',
          tableName,
          duration: performance.now() - startTime,
          success: false,
          recordsAffected: rows.length,
          error: formatError(error),
        });
        return { success: false, errors: [formatError(error)] };
      }
    }

    // @ts-ignore
    syncMetricsService.recordMetric({
      operation: 'batch_push',
      tableName,
      duration: performance.now() - startTime,
      success: false,
      recordsAffected: rows.length,
      error: 'Max retries exceeded',
    });
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
      // @ts-ignore
      syncMetricsService.recordMetric({
        operation: 'batch_pull',
        tableName,
        duration: performance.now() - startTime,
        success: false,
        recordsAffected: 0,
        error: 'Unknown table',
      });
      return {
        tableName,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: ['Unknown table'],
        duration: 0,
      };
    }

    let query = supabase.from(meta.remoteTable).select('*');
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;

    if (error) {
      // @ts-ignore
      syncMetricsService.recordMetric({
        operation: 'batch_pull',
        tableName,
        duration: performance.now() - startTime,
        success: false,
        recordsAffected: 0,
        error: error.message,
      });
      return {
        tableName,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [error.message],
        duration: performance.now() - startTime,
      };
    }

    let added = 0,
      updated = 0;
    const localTable = (db as any)[meta.localTable];

    // Para eventos, necesitamos comparar timestamps y verificar eliminados
    if (tableName === 'events' && localTable) {
      try {
        // Obtener lista de eventos eliminados localmente
        const deletedEvents = await db.deletedEvents.toArray();
        const deletedKeys = new Set(deletedEvents.map(e => e.eventKey.toLowerCase()));

        // Obtener todos los eventos locales existentes
        const existingEvents = await localTable.toArray();

        // Crear mapa de eventos locales: key -> { id, localTimestamp }
        const localEventsMap = new Map<string, { id: number; timestamp: number }>();
        existingEvents.forEach((e: any) => {
          const key = `${e.frcNumber || ''}~${e.barcode || ''}`.toLowerCase();
          if (key !== '~') {
            localEventsMap.set(key, {
              id: e.id!,
              timestamp: e.createdAt || 0,
            });
          }
        });

        // Procesar cada evento remoto
        for (const row of data || []) {
          const remoteKey = `${row.frc_code || ''}~${row.barcode || ''}`.toLowerCase();
          const remoteTimestamp = row.updated_at ? new Date(row.updated_at).getTime() : 0;

          // Solo procesar si tiene clave válida
          if (remoteKey === '~' || (!row.frc_code && !row.barcode)) continue;

          // SKIP: Si el evento fue eliminado localmente, no descargarlo
          if (deletedKeys.has(remoteKey)) {
            logger.info('SYNC', `Evento omitido (eliminado localmente): ${remoteKey}`);
            continue;
          }

          const localEvent = localEventsMap.get(remoteKey);

          if (!localEvent) {
            // No existe localmente, agregar
            const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
            if (local) {
              await localTable.put(local as any);
              added++;
            }
          } else if (remoteTimestamp > localEvent.timestamp) {
            // Existe pero remoto es más nuevo, actualizar
            const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
            if (local) {
              await localTable.update(localEvent.id, {
                ...local,
                syncStatus: 'synced',
              } as any);
              updated++;
            }
          }
          // Si local es más nuevo o igual, no hacer nada
        }

        if (added > 0 || updated > 0) {
          logger.info('SYNC', `Eventos: ${added} agregados, ${updated} actualizados desde nube`);
        }
      } catch (err) {
        logger.warn('SYNC', 'Error procesando eventos desde nube:', err);
      }
    } else if (meta.isDynamic) {
      // Tablas dinámicas: usar dynamic_data
      for (const row of data || []) {
        const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
        if (local) {
          await db.dynamic_data.put(local as any);
          added++;
        }
      }
    } else if (localTable) {
      // Tablas normales (no eventos)
      for (const row of data || []) {
        const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
        if (local) {
          await localTable.put(local as any);
          updated++;
        }
      }
    }

    // @ts-ignore
    syncMetricsService.recordMetric({
      operation: 'batch_pull',
      tableName,
      duration: performance.now() - startTime,
      success: true,
      recordsAffected: added + updated,
    });

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

    // Get dirty items (pending and error)
    let dirtyItems: any[] = [];

    if (meta.isDynamic) {
      const pending = await db.dynamic_data
        .where({ tableName: meta.filterValue, syncStatus: 'pending' })
        .toArray();
      const errors = await db.dynamic_data
        .where({ tableName: meta.filterValue, syncStatus: 'error' })
        .toArray();
      dirtyItems = [...pending, ...errors];

      // Get items marked for deletion
      const toDelete = await db.dynamic_data
        .where({ tableName: meta.filterValue, syncStatus: 'pending_delete' })
        .toArray();

      // Process deletions
      if (toDelete.length > 0) {
        for (const item of toDelete) {
          const remoteId = item.data?.id || item.data?.ID || item.id;
          try {
            const deleteResult = await supabase
              .from(meta.remoteTable)
              .delete()
              .eq(meta.primaryKey, remoteId);

            if (!deleteResult.error) {
              await db.dynamic_data.delete(item.id);
              logger.info('SYNC', `Eliminado de nube: ${meta.remoteTable}/${remoteId}`);
            }
          } catch (err) {
            logger.error('SYNC', `Error eliminando de nube: ${err}`);
          }
        }
      }
    } else {
      // For non-dynamic tables (like events), check syncStatus
      const pending = await localTable.where('syncStatus').equals('pending').toArray();
      const errors = await localTable.where('syncStatus').equals('error').toArray();
      dirtyItems = [...pending, ...errors];
    }

    if (!dirtyItems.length) return;

    // Para eventos, usar filtro mejorado que distingue create/update
    if (tableName === 'events' || meta.filterValue === 'EVENTOS') {
      try {
        const { filterEventsWithoutDuplicates } = await import('@/services/cloud/syncRegistry');
        const filterResult = await filterEventsWithoutDuplicates(dirtyItems);

        if (filterResult.skippedCount > 0) {
          logger.info('SYNC', `Eventos: ${filterResult.skippedCount} ya sincronizados, omitidos`);
        }

        // Process creates
        if (filterResult.toCreate.length > 0) {
          const createRows = filterResult.toCreate.map(item => {
            const row = meta.mapToRemote ? meta.mapToRemote(item) : item;
            // Eliminar id si existe para que Supabase lo genere
            delete row.id;
            return row;
          });
          await this.pushBatch(meta.remoteTable, createRows);
          // Mark as synced
          await db.transaction('rw', localTable, async () => {
            for (const item of filterResult.toCreate) {
              const id = item[meta.primaryKey] || item.id;
              await localTable.update(id, {
                syncStatus: 'synced',
                lastSyncTimestamp: Date.now(),
              });
            }
          });
          logger.info('SYNC', `Eventos: ${filterResult.toCreate.length} creados en nube`);
        }

        // Process updates - usar remoteId del evento existente en la nube
        if (filterResult.toUpdate.length > 0) {
          const updateRows = filterResult.toUpdate.map(item => {
            const row = meta.mapToRemote ? meta.mapToRemote(item) : item;
            // Reemplazar id local con id remoto
            if (item.remoteId !== undefined) {
              row.id = item.remoteId;
            }
            return row;
          });
          await this.pushBatch(meta.remoteTable, updateRows);
          // Mark as synced
          await db.transaction('rw', localTable, async () => {
            for (const item of filterResult.toUpdate) {
              const id = item[meta.primaryKey] || item.id;
              await localTable.update(id, {
                syncStatus: 'synced',
                lastSyncTimestamp: Date.now(),
              });
            }
          });
          logger.info('SYNC', `Eventos: ${filterResult.toUpdate.length} actualizados en nube`);
        }

        return;
      } catch (err) {
        logger.warn('SYNC', 'No se pudo verificar duplicados de eventos, sincronizando todos');
      }
    }

    // Default behavior for non-events tables
    for (let i = 0; i < dirtyItems.length; i += this.config.batchSize) {
      const chunk = dirtyItems.slice(i, i + this.config.batchSize);
      const rows = chunk.map(item => (meta.mapToRemote ? meta.mapToRemote(item) : item));

      const result = await this.pushBatch(meta.remoteTable, rows);

      if (result.success) {
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

  private async retryItem(id: number, error: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (!item) return;

    const newRetries = item.retries + 1;
    if (newRetries >= this.config.maxRetries) {
      await db.syncQueue.delete(id);
      telemetry.track('SYNC', 'MAX_RETRIES_EXCEEDED', {
        table: item.tableName,
        recordId: item.recordId,
      });
      return;
    }

    await db.syncQueue.update(id, {
      retries: newRetries,
      lastError: error,
    });
  }

  private async checkConflicts(): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];
    const now = Date.now();

    // Check conflicts for each registered table
    for (const [tableName, meta] of Object.entries(syncRegistry)) {
      if (meta.optional) continue;

      try {
        const localTable = (db as any)[meta.localTable];
        if (!localTable) continue;

        // Get items that have been modified both locally and remotely
        // A conflict exists if: local has pending changes AND remote has newer updates
        const localItems = await localTable.where('syncStatus').equals('pending').toArray();

        for (const localItem of localItems) {
          const recordId = localItem[meta.primaryKey] || localItem.id;

          // Fetch the remote version
          const { data: remoteItem, error } = await supabase
            .from(meta.remoteTable)
            .select('*')
            .eq(meta.primaryKey, recordId)
            .single();

          if (!error && remoteItem) {
            // Check if remote was updated after local was modified
            const remoteUpdated = new Date(remoteItem.updated_at).getTime();
            const localModified = localItem.lastSyncTimestamp || 0;

            // Conflict if remote is newer AND local has changes
            if (remoteUpdated > localModified) {
              conflicts.push({
                tableName,
                recordId: String(recordId),
                localValue: localItem,
                remoteValue: remoteItem,
                field: 'multiple',
                detectedAt: now,
                resolved: false,
              });
            }
          }
        }
      } catch (e) {
        logger.error('CONFLICT_CHECK', `Error checking conflicts for ${tableName}`, formatError(e));
      }
    }

    // Emit conflict detection events
    for (const conflict of conflicts) {
      this.emit({
        type: 'conflict_detected',
        conflict,
        tableName: conflict.tableName,
        recordId: conflict.recordId,
        timestamp: now,
      });
    }

    telemetry.track('SYNC', 'CONFLICTS_DETECTED', { count: conflicts.length });

    return conflicts;
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
    let resolved = 0;
    let failed = 0;

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveSingleConflict(conflict, strategy);

        if (resolution) {
          conflict.resolved = true;
          conflict.resolution = strategy.type;
          resolved++;

          this.emit({
            type: 'conflict_resolved',
            conflict,
            tableName: conflict.tableName,
            recordId: conflict.recordId,
            timestamp: Date.now(),
            metadata: { resolution: strategy.type },
          });
        }
      } catch (e) {
        failed++;
        logger.error(
          'CONFLICT_RESOLVE',
          `Failed to resolve conflict for ${conflict.tableName}/${conflict.recordId}`,
          formatError(e)
        );
      }
    }

    telemetry.track('SYNC', 'CONFLICTS_RESOLVED', { resolved, failed, strategy: strategy.type });

    return { resolved, failed };
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
    pendingChanges: Map<string, any[]>;
    debounceTimers: Map<string, NodeJS.Timeout>;
  } = {
    isConnected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    pendingChanges: new Map(),
    debounceTimers: new Map(),
  };

  private readonly RECONNECT_BASE_DELAY = 1000;
  private readonly RECONNECT_MAX_DELAY = 30000;
  private readonly DEBOUNCE_DELAY = 500;

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
    } catch (error) {
      logger.error('REALTIME', 'Failed to connect', formatError(error));
      this.scheduleReconnect();
    }
  }

  private handleRealtimeStatus(status: string): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.realtimeState.isConnected = true;
        this.realtimeState.reconnectAttempts = 0;
        this.realtimeState.lastHeartbeat = Date.now();
        logger.success('REALTIME', 'Connected successfully');
        telemetry.track('SYNC', 'REALTIME_CONNECTED');
        this.emit({
          type: 'sync_complete',
          timestamp: Date.now(),
          metadata: { eventType: 'realtime_connected' },
        });
        break;

      case 'CLOSED':
      case 'CHANNEL_ERROR':
        this.realtimeState.isConnected = false;
        logger.warn('REALTIME', `Connection status: ${status}`);
        this.scheduleReconnect();
        break;

      case 'TIMED_OUT':
        this.realtimeState.isConnected = false;
        logger.warn('REALTIME', 'Connection timed out');
        this.scheduleReconnect();
        break;
    }
  }

  private scheduleReconnect(): void {
    if (!this.config.enableRealtime) return;

    const attempts = this.realtimeState.reconnectAttempts;
    const delay = Math.min(
      this.RECONNECT_BASE_DELAY * Math.pow(2, attempts),
      this.RECONNECT_MAX_DELAY
    );

    logger.info('REALTIME', `Scheduling reconnect in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      this.realtimeState.reconnectAttempts++;
      this.stopRealtimeSync();
      this.connectRealtime();
    }, delay);
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

  private handleRealtimeChange = async (payload: any): Promise<void> => {
    const tableName = payload.table;
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    if (!tableName) return;

    logger.info('REALTIME', `${eventType} on ${tableName}`);

    // Debounce changes for the same table
    this.debounceRealtimeChange(tableName, { eventType, newRecord, oldRecord });
  };

  private debounceRealtimeChange(
    tableName: string,
    change: { eventType: string; newRecord?: any; oldRecord?: any }
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
    }, this.DEBOUNCE_DELAY);

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
      if (['INSERT', 'UPDATE'].includes(eventType) && lastChange.newRecord) {
        await this.pullTable(tableName);
        telemetry.track('SYNC', 'REALTIME_PULL', { table: tableName, changes: changes.length });
      } else if (eventType === 'DELETE' && lastChange.oldRecord) {
        const meta = syncRegistry[tableName];
        if (meta) {
          const localTable = (db as any)[meta.localTable];
          await localTable?.delete(lastChange.oldRecord[meta.primaryKey]);
          telemetry.track('SYNC', 'REALTIME_DELETE', { table: tableName });
        }
      }

      this.emit({
        type: 'sync_complete',
        tableName,
        timestamp: Date.now(),
        metadata: { eventType, changesCount: changes.length },
      });
    } catch (error) {
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
  getRealtimeStatus(): { isConnected: boolean; lastHeartbeat: number; pendingChanges: number } {
    return {
      isConnected: this.realtimeState.isConnected,
      lastHeartbeat: this.realtimeState.lastHeartbeat,
      pendingChanges: Array.from(this.realtimeState.pendingChanges.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
    };
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
    } catch (error) {
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

// Re-export legacy functions for backwards compatibility
export { uploadBatch, uploadGroupLegacy, resetSyncLock } from './syncLegacy';
