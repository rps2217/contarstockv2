/**
 * TransactionalSyncQueue - Cola de Sincronización Transaccional
 *
 * Mejora del SyncQueueService original con:
 * - Verificación de duplicados antes de crear
 * - Ordenamiento por prioridad
 * - Métricas de performance
 * - Eventos para UI reactiva
 */

import { db } from '../../db';
import { logger } from '@/services/logger';
import { EventBus, AppEvents } from '@/core/events/EventBus';

// ============================================================================
// TIPOS
// ============================================================================

export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncPriority = 'high' | 'normal' | 'low';

export interface SyncQueueStats {
  total: number;
  pending: number;
  failed: number;
  byTable: Record<string, number>;
}

export interface SyncResult {
  success: boolean;
  itemId: number;
  error?: string;
  duration: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 60000;
const BATCH_SIZE = 10;

// ============================================================================
// SERVICE
// ============================================================================

class TransactionalSyncQueueClass {
  private isProcessing = false;
  private metrics = {
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    avgDuration: 0,
  };

  /**
   * Encola una operación con verificación de duplicados
   */
  async enqueue(
    tableName: string,
    operation: SyncOperationType,
    recordId: string,
    data: Record<string, unknown>,
    priority: SyncPriority = 'normal'
  ): Promise<number> {
    try {
      // Verificar si ya existe una operación pendiente para este registro
      const existing = await db.syncQueue
        .filter(
          item =>
            item.tableName === tableName &&
            item.operation === operation &&
            item.recordId === recordId &&
            item.retries < MAX_RETRIES
        )
        .first();

      if (existing) {
        // Actualizar en lugar de crear duplicado
        await db.syncQueue.update(existing.id!, {
          data,
          timestamp: Date.now(),
          priority,
        });

        logger.info('TransactionalSyncQueue', 'Updated existing operation', { id: existing.id });
        return existing.id!;
      }

      // Crear nuevo item
      const id = (await db.syncQueue.add({
        tableName,
        operation,
        recordId,
        data,
        timestamp: Date.now(),
        retries: 0,
        priority,
      })) as number;

      logger.info('TransactionalSyncQueue', 'Operation enqueued', {
        id,
        tableName,
        operation,
        recordId,
      });

      // Publicar evento
      EventBus.publish(AppEvents.SYNC_QUEUE_CHANGED, { action: 'enqueued', id });

      // Intentar procesar inmediatamente si hay conexión
      if (navigator.onLine) {
        this.processQueue();
      }

      return id;
    } catch (error) {
      logger.error('TransactionalSyncQueue', 'Failed to enqueue', {
        tableName,
        operation,
        recordId,
        error,
      });
      throw error;
    }
  }

  /**
   * Procesa la cola de operaciones
   */
  async processQueue(): Promise<SyncResult[]> {
    if (this.isProcessing || !navigator.onLine) {
      return [];
    }

    this.isProcessing = true;
    const results: SyncResult[] = [];

    try {
      // Obtener items pendientes ordenados por prioridad y timestamp
      const items = await db.syncQueue
        .filter(item => item.retries < MAX_RETRIES)
        .sortBy('timestamp');

      // Ordenar por prioridad
      items.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });

      const batch = items.slice(0, BATCH_SIZE);

      if (batch.length === 0) {
        return [];
      }

      logger.info('TransactionalSyncQueue', `Processing batch of ${batch.length} items`);

      for (const item of batch) {
        const startTime = performance.now();

        try {
          // Ejecutar operación
          await this.executeSync(item);

          // Eliminar si fue exitoso
          await db.syncQueue.delete(item.id!);

          const duration = performance.now() - startTime;
          results.push({ success: true, itemId: item.id!, duration });

          this.updateMetrics(true, duration);

          logger.info('TransactionalSyncQueue', 'Sync completed', {
            tableName: item.tableName,
            operation: item.operation,
            duration: `${duration.toFixed(2)}ms`,
          });
        } catch (error) {
          const duration = performance.now() - startTime;
          const newRetries = item.retries + 1;

          // Actualizar con error
          await db.syncQueue.update(item.id!, {
            retries: newRetries,
            lastError: (error as Error).message,
            timestamp: Date.now(),
          });

          results.push({
            success: false,
            itemId: item.id!,
            error: (error as Error).message,
            duration,
          });

          this.updateMetrics(false, duration);

          logger.warn('TransactionalSyncQueue', 'Sync failed', {
            tableName: item.tableName,
            attempt: `${newRetries}/${MAX_RETRIES}`,
            error: (error as Error).message,
          });
        }
      }

      EventBus.publish(AppEvents.SYNC_QUEUE_CHANGED, {
        action: 'processed',
        count: results.length,
      });
    } catch (error) {
      logger.error('TransactionalSyncQueue', 'Batch processing failed', { error });
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Ejecuta sincronización con Supabase
   */
  private async executeSync(item: {
    tableName: string;
    operation: SyncOperationType;
    recordId: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    const { tableName, operation, recordId, data } = item;

    switch (operation) {
      case 'create': {
        const { error } = await supabase.from(tableName).insert(data as any);
        if (error) {
          // Manejar duplicate key
          if (error.code === '23505') {
            const { error: updateError } = await supabase
              .from(tableName)
              .update(data as any)
              .eq('id', recordId);
            if (updateError) throw new Error(updateError.message);
          } else {
            throw new Error(error.message);
          }
        }
        break;
      }

      case 'update': {
        const { error } = await supabase
          .from(tableName)
          .update(data as any)
          .eq('id', recordId);
        if (error) throw new Error(error.message);
        break;
      }

      case 'delete': {
        const { error } = await supabase.from(tableName).delete().eq('id', recordId);
        if (error) throw new Error(error.message);
        break;
      }
    }
  }

  /**
   * Actualiza métricas
   */
  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.totalProcessed++;
    if (success) {
      this.metrics.totalSucceeded++;
    } else {
      this.metrics.totalFailed++;
    }
    this.metrics.avgDuration =
      (this.metrics.avgDuration * (this.metrics.totalProcessed - 1) + duration) /
      this.metrics.totalProcessed;
  }

  /**
   * Obtiene estadísticas de la cola
   */
  async getStats(): Promise<SyncQueueStats> {
    const items = await db.syncQueue.toArray();

    const stats: SyncQueueStats = {
      total: items.length,
      pending: items.filter(i => i.retries < MAX_RETRIES).length,
      failed: items.filter(i => i.retries >= MAX_RETRIES).length,
      byTable: {},
    };

    for (const item of items) {
      stats.byTable[item.tableName] = (stats.byTable[item.tableName] || 0) + 1;
    }

    return stats;
  }

  /**
   * Obtiene métricas de performance
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Limpia operaciones fallidas antiguas
   */
  async cleanup(olderThanDays = 7): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const oldFailed = await db.syncQueue
      .filter(item => item.retries >= MAX_RETRIES && item.timestamp < cutoff)
      .toArray();

    if (oldFailed.length > 0) {
      await db.syncQueue.bulkDelete(oldFailed.map(i => i.id!));
      logger.info('TransactionalSyncQueue', `Cleaned ${oldFailed.length} old failed operations`);
    }

    return oldFailed.length;
  }

  /**
   * Reintenta operaciones fallidas
   */
  async retryFailed(): Promise<number> {
    const failed = await db.syncQueue.filter(item => item.retries >= MAX_RETRIES).toArray();

    for (const item of failed) {
      await db.syncQueue.update(item.id!, {
        retries: 0,
        lastError: undefined,
      });
    }

    if (failed.length > 0) {
      logger.info('TransactionalSyncQueue', `Retrying ${failed.length} failed operations`);
      EventBus.publish(AppEvents.SYNC_QUEUE_CHANGED, { action: 'retry', count: failed.length });
      this.processQueue();
    }

    return failed.length;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const TransactionalSyncQueue = new TransactionalSyncQueueClass();
export default TransactionalSyncQueue;
