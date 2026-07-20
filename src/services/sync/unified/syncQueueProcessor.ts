/**
 * =============================================================================
 * SYNC QUEUE PROCESSOR - Procesamiento de cola de sincronización
 * =============================================================================
 *
 * Funciones para procesar la cola de sincronización de manera eficiente.
 * Extraído de UnifiedSyncEngine para reducir complejidad.
 *
 * @module sync/unified/syncQueueProcessor
 */

import { db } from '@/db';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { syncRegistry } from './registry';
import { formatError } from './syncHelpers';
import type { QueuedSyncItem } from './types';

interface QueueProcessorConfig {
  batchSize: number;
  maxRetries: number;
  baseDelayMs: number;
}

interface ProcessQueueResult {
  processed: number;
  failed: number;
  remaining: number;
  processedIds: number[];
  errors: Record<number, string>;
}

/**
 * Obtiene el siguiente item de la cola aplicando backoff
 */
export async function dequeueItem(config: QueueProcessorConfig): Promise<QueuedSyncItem | null> {
  const items = await db.syncQueue.orderBy('timestamp').toArray();
  const now = Date.now();

  for (const item of items) {
    if (item.retries > 0) {
      const delay = config.baseDelayMs * Math.pow(2, item.retries - 1);
      const nextRetry = item.timestamp + delay;
      if (now < nextRetry) continue;
    }
    return item;
  }

  return items[0] || null;
}

/**
 * Procesa un item individual de la cola
 */
export async function processQueueItem(item: QueuedSyncItem): Promise<void> {
  const meta = syncRegistry[item.tableName];
  if (!meta) throw new Error(`Unknown table: ${item.tableName}`);

  switch (item.operation) {
    case 'delete':
      const { error } = await supabase
        .from(meta.remoteTable)
        .delete()
        .eq(meta.primaryKey, item.recordId);
      if (error) throw error;
      break;

    case 'create':
    case 'update': {
      const remoteData = meta.mapToRemote ? meta.mapToRemote(item.data) : item.data;
      const { error: upsertError } = await supabase
        .from(meta.remoteTable)
        .upsert(remoteData, { onConflict: meta.primaryKey });
      if (upsertError) throw upsertError;
      break;
    }
  }

  // Remove from queue on success
  await db.syncQueue.delete(item.id!);
}

/**
 * Reintenta un item fallido
 */
export async function retryItem(id: number, error: string, maxRetries: number): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (!item) return;

  const newRetries = item.retries + 1;
  if (newRetries >= maxRetries) {
    await db.syncQueue.delete(id);
    return;
  }

  await db.syncQueue.update(id, {
    retries: newRetries,
    lastError: error,
  });
}

/**
 * Procesa la cola de sincronización
 */
export async function processSyncQueue(
  config: QueueProcessorConfig,
  options: {
    isProcessingQueue: { current: boolean };
    emit?: (event: {
      type: string;
      tableName?: string;
      recordId?: string;
      error?: string;
      timestamp: number;
    }) => void;
  }
): Promise<ProcessQueueResult> {
  if (options.isProcessingQueue.current) {
    return { processed: 0, failed: 0, remaining: 0, processedIds: [], errors: {} };
  }

  options.isProcessingQueue.current = true;
  let processed = 0;
  let failed = 0;
  const processedIds: number[] = [];
  const errors: Record<number, string> = {};

  try {
    while (processed + failed < config.batchSize) {
      const item = await dequeueItem(config);
      if (!item) break;

      try {
        await processQueueItem(item);
        processedIds.push(item.id!);
        processed++;
        options.emit?.({
          type: 'item_removed',
          tableName: item.tableName,
          recordId: item.recordId,
          timestamp: Date.now(),
        });
      } catch (error: unknown) {
        const errorMsg = formatError(error);
        errors[item.id!] = errorMsg;
        failed++;
        options.emit?.({
          type: 'item_failed',
          tableName: item.tableName,
          recordId: item.recordId,
          error: errorMsg,
          timestamp: Date.now(),
        });

        // Retry logic
        if (item.retries < config.maxRetries) {
          await retryItem(item.id!, errorMsg, config.maxRetries);
          options.emit?.({
            type: 'item_retry',
            tableName: item.tableName,
            recordId: item.recordId,
            timestamp: Date.now(),
          });
        }
      }
    }
  } finally {
    options.isProcessingQueue.current = false;
  }

  const remaining = await db.syncQueue.count();
  return { processed, failed, remaining, processedIds, errors };
}
