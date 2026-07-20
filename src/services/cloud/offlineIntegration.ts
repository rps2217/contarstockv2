/**
 * Offline Integration - Hook para sincronización offline
 *
 * Integra SyncQueueService con las operaciones existentes de la app.
 * Reemplaza las llamadas directas a Supabase con queue + sync automático.
 */

import { syncQueueService } from './SyncQueueService';
import { logger } from '../logger';

/**
 * Wrapper para operaciones CRUD que usa cola offline
 */
export class OfflineIntegration {
  /**
   * Crea un registro usando cola offline
   */
  static async create(
    tableName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (navigator.onLine) {
      // Si hay conexión, intentamos directo primero
      try {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from(tableName).insert(data);
        if (!error) {
          logger.info('OFFLINE_SYNC', `Sincronizado directo: ${tableName}`);
          return;
        }
        // Si falla, usamos la cola
        logger.warn('OFFLINE_SYNC', `Fallback a cola: ${error.message}`);
      } catch (e: unknown) {
        logger.warn('OFFLINE_SYNC', `Error en sync directo, usando cola`);
      }
    }

    // Encolar para cuando haya conexión
    await syncQueueService.enqueue({
      tableName,
      operation: 'create',
      recordId,
      data,
      priority: 'high',
    });
  }

  /**
   * Actualiza un registro usando cola offline
   */
  static async update(
    tableName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (navigator.onLine) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from(tableName).update(data).eq('id', recordId);
        if (!error) {
          logger.info('OFFLINE_SYNC', `Actualizado directo: ${tableName}/${recordId}`);
          return;
        }
      } catch (e: unknown) {
        logger.warn('OFFLINE_SYNC', `Error en update directo`);
      }
    }

    await syncQueueService.enqueue({
      tableName,
      operation: 'update',
      recordId,
      data,
      priority: 'normal',
    });
  }

  /**
   * Elimina un registro usando cola offline
   */
  static async delete(tableName: string, recordId: string): Promise<void> {
    if (navigator.onLine) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from(tableName).delete().eq('id', recordId);
        if (!error) {
          logger.info('OFFLINE_SYNC', `Eliminado directo: ${tableName}/${recordId}`);
          return;
        }
      } catch (e: unknown) {
        logger.warn('OFFLINE_SYNC', `Error en delete directo`);
      }
    }

    await syncQueueService.enqueue({
      tableName,
      operation: 'delete',
      recordId,
      data: { id: recordId },
      priority: 'low',
    });
  }
}

// Inicializar procesamiento automático al cargar la app
if (typeof window !== 'undefined') {
  import('./SyncQueueService').then(({ syncQueueService }) => {
    syncQueueService.initAutoProcess();
    logger.info('OFFLINE_SYNC', 'Servicio de cola offline inicializado');
  });
}
