/**
 * SyncQueueService - Offline-First Queue System
 * 
 * Cola persistente de operaciones pendientes que se procesan cuando hay conexión.
 * Implementa retry automático con backoff exponencial.
 */

import { db } from '@/db';
import { logger } from '../logger';
import { handleError } from '../types';

export interface QueuedOperation {
  id?: number;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
  priority: 'high' | 'normal' | 'low';
}

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 segundo
const MAX_RETRY_DELAY = 60000; // 1 minuto

class SyncQueueService {
  private isProcessing = false;
  private onlineHandler: (() => void) | null = null;

  /**
   * Agrega una operación a la cola
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'retries' | 'timestamp'>): Promise<void> {
    try {
      const queuedItem: QueuedOperation = {
        ...operation,
        timestamp: Date.now(),
        retries: 0,
        priority: operation.priority || 'normal'
      };

      await db.syncQueue.add(queuedItem);
      logger.info('SYNC_QUEUE', `Operación encolada: ${operation.operation} en ${operation.tableName}`);
      
      // Intentar procesar inmediatamente si hay conexión
      if (navigator.onLine) {
        this.processQueue();
      }
    } catch (err) {
      logger.error('SYNC_QUEUE', 'Error al encolar operación', handleError(err));
    }
  }

  /**
   * Obtiene estadísticas de la cola
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    failed: number;
    byTable: Record<string, number>;
  }> {
    try {
      const all = await db.syncQueue.toArray();
      const failed = all.filter(item => item.retries >= MAX_RETRIES);
      
      const byTable: Record<string, number> = {};
      all.forEach(item => {
        byTable[item.tableName] = (byTable[item.tableName] || 0) + 1;
      });

      return {
        total: all.length,
        pending: all.length - failed.length,
        failed: failed.length,
        byTable
      };
    } catch (err) {
      logger.error('SYNC_QUEUE', 'Error al obtener stats', handleError(err));
      return { total: 0, pending: 0, failed: 0, byTable: {} };
    }
  }

  /**
   * Procesa toda la cola de operaciones pendientes
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;
    
    this.isProcessing = true;
    
    try {
      const pending = await db.syncQueue
        .where('retries')
        .below(MAX_RETRIES)
        .sortBy('timestamp');

      if (pending.length === 0) return;

      logger.info('SYNC_QUEUE', `Procesando cola: ${pending.length} operaciones`);

      for (const item of pending) {
        const delay = this.calculateBackoff(item.retries);
        
        // Verificar si debe esperar
        if (item.retries > 0) {
          const timeSinceLastAttempt = Date.now() - item.timestamp;
          if (timeSinceLastAttempt < delay) continue;
        }

        try {
          await this.executeOperation(item);
          await db.syncQueue.delete(item.id!);
          logger.info('SYNC_QUEUE', `Operación completada: ${item.operation} en ${item.tableName}`);
        } catch (err) {
          const errorMsg = handleError(err);
          const newRetries = item.retries + 1;
          
          await db.syncQueue.update(item.id!, {
            retries: newRetries,
            lastError: errorMsg,
            timestamp: Date.now()
          });

          logger.warn('SYNC_QUEUE', 
            `Reintento ${newRetries}/${MAX_RETRIES} para ${item.tableName}: ${errorMsg}`
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Ejecuta una operación individual contra Supabase
   */
  private async executeOperation(item: QueuedOperation): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    const table = item.tableName;
    const data = { ...item.data };

    switch (item.operation) {
      case 'create':
        const { error: createError } = await supabase.from(table).insert(data);
        if (createError) throw new Error(createError.message);
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', item.recordId);
        if (updateError) throw new Error(updateError.message);
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', item.recordId);
        if (deleteError) throw new Error(deleteError.message);
        break;
    }
  }

  /**
   * Calcula delay con backoff exponencial
   */
  private calculateBackoff(retries: number): number {
    const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, retries), MAX_RETRY_DELAY);
    // Agregar jitter aleatorio (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  /**
   * Inicializa listeners de conexión
   */
  initAutoProcess(): void {
    // Procesar cuando se recupera conexión
    this.onlineHandler = () => {
      logger.info('SYNC_QUEUE', 'Conexión restaurada, procesando cola...');
      this.processQueue();
    };

    window.addEventListener('online', this.onlineHandler);
    
    // Procesar periódicamente cada 30 segundos si hay conexión
    setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
      }
    }, 30000);
  }

  /**
   * Limpia operaciones fallidas antiguas (más de 7 días)
   */
  async cleanup(): Promise<void> {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const oldFailed = await db.syncQueue
      .where('retries')
      .equals(MAX_RETRIES)
      .filter(item => item.timestamp < sevenDaysAgo)
      .toArray();

    for (const item of oldFailed) {
      await db.syncQueue.delete(item.id!);
      logger.info('SYNC_QUEUE', `Limpiando operación antigua: ${item.tableName}`);
    }
  }

  /**
   * Reintenta todas las operaciones fallidas
   */
  async retryFailed(): Promise<void> {
    await db.syncQueue
      .where('retries')
      .equals(MAX_RETRIES)
      .modify({ retries: 0, lastError: undefined });
    
    this.processQueue();
  }
}

export const syncQueueService = new SyncQueueService();
