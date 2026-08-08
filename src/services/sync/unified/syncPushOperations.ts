/**
 * Sync Push Operations
 * Lógica para empujar cambios locales a Supabase
 */

import { db } from '@/db';
import { logger } from '@/services/logger';
import type { TableSyncMeta } from './types';
import { markAsSynced } from './syncTableOperations';
import { executeBatchUpsert } from './syncBatchOperations';
import type { SyncableRecord } from './syncRealtimeConstants';

export interface FilterResult {
  toCreate: SyncableRecord[];
  toUpdate: SyncableRecord[];
  skippedCount: number;
}

/** Tipos para tablas Dexie */
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

/** Resultado de push batch */
interface PushBatchResult {
  success: boolean;
  uploaded?: number;
  errors?: string[];
}

/**
 * Push de cambios para tablas genéricas (no eventos)
 */
export async function pushGenericChanges(
  localTable: DexieTable,
  meta: TableSyncMeta,
  dirtyItems: SyncableRecord[],
  batchSize: number,
  pushBatch: (tableName: string, rows: Record<string, unknown>[]) => Promise<PushBatchResult>
): Promise<void> {
  for (let i = 0; i < dirtyItems.length; i += batchSize) {
    const chunk = dirtyItems.slice(i, i + batchSize);
    const rows = chunk.map(item => (meta.mapToRemote ? meta.mapToRemote(item) : item));

    const result = await pushBatch(meta.remoteTable, rows);

    if (result.success) {
      await markAsSynced(meta.localTable, meta, chunk);
    }
  }
}

/**
 * Push de cambios para eventos (con filtro de duplicados)
 */
export async function pushEventsChanges(
  localTable: DexieTable,
  meta: TableSyncMeta,
  dirtyItems: SyncableRecord[],
  pushBatch: (tableName: string, rows: Record<string, unknown>[]) => Promise<PushBatchResult>
): Promise<void> {
  try {
    const { filterEventsWithoutDuplicates } = await import('@/services/cloud/syncRegistry');

    // Cast to expected type for filterEventsWithoutDuplicates
    const eventsToFilter = dirtyItems.map(item => ({
      data: item as Record<string, unknown>,
      id: String(item.id || ''),
      timestamp: typeof item.created_at === 'number' ? item.created_at : Date.now(),
    }));

    const filterResult = await filterEventsWithoutDuplicates(eventsToFilter);

    if (filterResult.skippedCount > 0) {
      logger.info('SYNC', `Eventos: ${filterResult.skippedCount} ya sincronizados, omitidos`);
    }

    // Process creates
    if (filterResult.toCreate.length > 0) {
      const createRows = filterResult.toCreate.map(item => {
        const row = meta.mapToRemote ? meta.mapToRemote(item) : item;
        delete row.id;
        return row;
      });
      await pushBatch(meta.remoteTable, createRows);
      await markAsSynced('events', meta, filterResult.toCreate);
      logger.info('SYNC', `Eventos: ${filterResult.toCreate.length} creados en nube`);
    }

    // Process updates
    if (filterResult.toUpdate.length > 0) {
      const updateRows = filterResult.toUpdate.map(item => {
        const row = meta.mapToRemote ? meta.mapToRemote(item) : item;
        if (item.remoteId !== undefined) {
          row.id = item.remoteId;
        }
        return row;
      });
      await pushBatch(meta.remoteTable, updateRows);
      await markAsSynced('events', meta, filterResult.toUpdate);
      logger.info('SYNC', `Eventos: ${filterResult.toUpdate.length} actualizados en nube`);
    }
  } catch (err: unknown) {
    logger.warn('SYNC', 'No se pudo verificar duplicados de eventos, sincronizando todos');
    // Fallback: push all as generic
    await pushGenericChanges(localTable, meta, dirtyItems, 100, pushBatch);
  }
}

/**
 * Retry logic para items en cola
 */
export async function retryQueueItem(
  id: number,
  maxRetries: number,
  telemetry: { track: (category: string, event: string, data?: Record<string, unknown>) => void }
): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (!item) return;

  const newRetries = (item.retries || 0) + 1;
  if (newRetries >= maxRetries) {
    await db.syncQueue.delete(id);
    telemetry.track('SYNC', 'MAX_RETRIES_EXCEEDED', {
      table: item.tableName,
      recordId: item.recordId,
    });
    return;
  }

  await db.syncQueue.update(id, {
    retries: newRetries,
    lastError: item.lastError,
  });
}
