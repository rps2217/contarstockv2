/**
 * SyncQueueService - Cola de sincronización offline con retry y backoff exponencial
 * 
 * Características:
 * - Persistencia en IndexedDB (Dexie)
 * - Retry con backoff exponencial
 * - Desduplicación de operaciones
 * - Eventos de progreso
 */

import { db } from '../../db';
import { logger } from '../logger';
import { telemetry } from '../telemetry';
import { handleError } from '../utils';

// Tipos compatibles con el schema existente
export interface QueuedSyncItem {
  id?: number;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface SyncQueueOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export type SyncQueueEventType = 'item_added' | 'item_removed' | 'item_failed' | 'item_retry' | 'sync_complete' | 'sync_error';
export type SyncQueueListener = (event: SyncQueueEventType, item?: QueuedSyncItem, error?: string) => void;

// Constantes
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 60000;

class SyncQueueService {
  private listeners: Set<SyncQueueListener> = new Set();
  private isProcessing = false;
  private options: Required<SyncQueueOptions>;

  constructor(options: SyncQueueOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelayMs: options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
      maxDelayMs: options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    };
  }

  // === Gestión de listeners ===
  addListener(listener: SyncQueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncQueueEventType, item?: QueuedSyncItem, error?: string): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, item, error);
      } catch (e) {
        console.error('Error en listener de sync queue:', e);
      }
    });
  }

  // === Operaciones de cola ===
  async enqueue(item: Omit<QueuedSyncItem, 'id' | 'timestamp' | 'retries'>): Promise<number> {
    const startTime = performance.now();
    
    // Verificar si ya existe una operación similar pendiente
    const existing = await db.syncQueue
      .where({ tableName: item.tableName, recordId: item.recordId })
      .first();

    if (existing) {
      // Actualizar la operación existente según el tipo
      if (existing.operation === 'delete' || item.operation === 'delete') {
        // DELETE sobrescribe cualquier operación previa
        await db.syncQueue.update(existing.id!, {
          operation: 'delete',
          data: item.data,
          timestamp: Date.now(),
          retries: 0,
          lastError: undefined
        });
        logger.info('SYNC_QUEUE', `Actualizada operación DELETE pendiente: ${item.tableName}/${item.recordId}`);
        this.emit('item_removed', existing);
        this.emit('item_added', await db.syncQueue.get(existing.id!));
        return existing.id!;
      } else {
        // UPDATE sobrescribe INSERT o UPDATE previo
        await db.syncQueue.update(existing.id!, {
          operation: item.operation,
          data: item.data,
          timestamp: Date.now(),
          retries: 0,
          lastError: undefined
        });
        logger.info('SYNC_QUEUE', `Actualizada operación pendiente: ${item.tableName}/${item.recordId}`);
        this.emit('item_removed', existing);
        this.emit('item_added', await db.syncQueue.get(existing.id!));
        return existing.id!;
      }
    }

    // Crear nuevo item
    const newItem: QueuedSyncItem = {
      ...item,
      timestamp: Date.now(),
      retries: 0,
    };

    const id = await db.syncQueue.add(newItem);
    telemetry.track('SYNC_QUEUE', 'ITEM_ENQUEUED', { table: item.tableName, operation: item.operation }, performance.now() - startTime);
    logger.info('SYNC_QUEUE', `Item encolado: ${item.tableName}/${item.recordId} (${item.operation})`);
    
    const queuedItem = await db.syncQueue.get(id);
    this.emit('item_added', queuedItem!);
    
    return id;
  }

  async dequeue(): Promise<QueuedSyncItem | null> {
    // Buscar items por timestamp (ordena por más antiguos primero)
    const items = await db.syncQueue.orderBy('timestamp').toArray();
    return items[0] || null;
  }

  async remove(id: number): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (item) {
      await db.syncQueue.delete(id);
      this.emit('item_removed', item);
      logger.info('SYNC_QUEUE', `Item removido: ${item.tableName}/${item.recordId}`);
    }
  }

  async getQueueSize(): Promise<number> {
    return await db.syncQueue.count();
  }

  async getAll(): Promise<QueuedSyncItem[]> {
    return await db.syncQueue.toArray();
  }

  async clear(): Promise<void> {
    const items = await this.getAll();
    await db.syncQueue.clear();
    items.forEach(item => this.emit('item_removed', item));
    logger.info('SYNC_QUEUE', `Cola limpiada: ${items.length} items`);
  }

  // === Retry logic ===
  async markForRetry(id: number, error: string): Promise<boolean> {
    const item = await db.syncQueue.get(id);
    if (!item) return false;

    const newRetries = item.retries + 1;
    
    if (newRetries >= this.options.maxRetries) {
      // Max retries exceeded - remove from queue
      await this.remove(id);
      telemetry.track('SYNC_QUEUE', 'MAX_RETRIES_EXCEEDED', { table: item.tableName, recordId: item.recordId });
      logger.error('SYNC_QUEUE_FAIL', `Max retries exceeded for ${item.tableName}/${item.recordId}: ${error}`);
      this.emit('item_failed', item, error);
      return false;
    }

    await db.syncQueue.update(id, {
      retries: newRetries,
      lastError: error,
    });

    const updatedItem = await db.syncQueue.get(id);
    telemetry.track('SYNC_QUEUE', 'ITEM_RETRY', { 
      table: item.tableName, 
      retries: newRetries, 
      maxRetries: this.options.maxRetries 
    });
    logger.info('SYNC_QUEUE', `Retry ${newRetries}/${this.options.maxRetries}: ${item.tableName}/${item.recordId}`);
    this.emit('item_retry', updatedItem!);
    
    return true;
  }

  // === Procesamiento ===
  async processItem(item: QueuedSyncItem, syncFn: (item: QueuedSyncItem) => Promise<void>): Promise<boolean> {
    try {
      await syncFn(item);
      await this.remove(item.id!);
      telemetry.track('SYNC_QUEUE', 'ITEM_SYNCED', { table: item.tableName, operation: item.operation });
      logger.success('SYNC_QUEUE', `Sincronizado: ${item.tableName}/${item.recordId}`);
      return true;
    } catch (error) {
      const errorMsg = handleError(error);
      const canRetry = await this.markForRetry(item.id!, errorMsg);
      this.emit('sync_error', item, errorMsg);
      return canRetry;
    }
  }

  async processQueue(
    syncFn: (item: QueuedSyncItem) => Promise<void>,
    options: { batchSize?: number } = {}
  ): Promise<{ processed: number; failed: number; remaining: number }> {
    if (this.isProcessing) {
      logger.warn('SYNC_QUEUE', 'Ya hay un procesamiento en curso');
      return { processed: 0, failed: 0, remaining: await this.getQueueSize() };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;
    const batchSize = options.batchSize ?? 10;

    try {
      while (processed + failed < batchSize) {
        const item = await this.dequeue();
        if (!item) break;

        const success = await this.processItem(item, syncFn);
        if (success) {
          processed++;
        } else {
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    const remaining = await this.getQueueSize();
    telemetry.track('SYNC_QUEUE', 'QUEUE_PROCESSED', { processed, failed, remaining });
    
    if (processed > 0 || failed > 0) {
      this.emit('sync_complete');
    }

    return { processed, failed, remaining };
  }

  // === Utilidades ===
  calculateDelay(retryCount: number): number {
    return Math.min(
      this.options.baseDelayMs * Math.pow(2, retryCount),
      this.options.maxDelayMs
    );
  }

  async getStats(): Promise<{ pending: number; processing: boolean; maxRetries: number }> {
    return {
      pending: await this.getQueueSize(),
      processing: this.isProcessing,
      maxRetries: this.options.maxRetries,
    };
  }
}

// Instancia singleton
export const syncQueueService = new SyncQueueService({
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
});

export default SyncQueueService;
