
import { db } from '../db';
import { SyncJob } from '../types';
import { cloudApi } from './cloud/apiClient';
import { logger } from './logger';

export type SyncTaskType = 'ADD_EXPIRY' | 'REMOVE_EXPIRY';

export class SyncQueueService {
  private static isProcessing = false;

  /**
   * Agrega una tarea a la cola de sincronización.
   */
  static async addTask(type: SyncTaskType, data: any) {
    const job: SyncJob = {
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
      data: { type, ...data }
    };
    
    const id = await db.syncQueue.add(job);
    logger.info("SYNC_QUEUE", `Tarea agregada a la cola: ${type} (ID: ${id})`);
    
    // Intentar procesar inmediatamente
    this.processQueue();
    return id;
  }

  /**
   * Procesa las tareas pendientes en la cola.
   */
  static async processQueue() {
    if (this.isProcessing) return;
    if (!navigator.onLine) return;

    try {
      this.isProcessing = true;
      const pendingJobs = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .toArray();

      if (pendingJobs.length === 0) return;

      logger.info("SYNC_QUEUE", `Procesando ${pendingJobs.length} tareas pendientes...`);

      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error("SYNC_QUEUE_PROCESS_FAIL", "Error al procesar la cola de sincronización");
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processJob(job: SyncJob) {
    if (!job.id) return;

    try {
      await db.syncQueue.update(job.id, { status: 'processing' });
      
      const { type, ...data } = job.data;
      let result;

      if (type === 'ADD_EXPIRY') {
        const { id: localId, ...payload } = data;
        result = await cloudApi.post('add_expiration', payload);
        if (result?.success && localId) {
          await db.cloudExpirations.update(localId, { syncStatus: 'synced', syncError: undefined });
        }
      } else if (type === 'REMOVE_EXPIRY') {
        result = await cloudApi.post('remove_expiration', data);
      }

      if (result?.success) {
        await db.syncQueue.delete(job.id);
        logger.info("SYNC_QUEUE_SUCCESS", `Tarea completada: ${type} (ID: ${job.id})`);
      } else {
        throw new Error(result?.error || 'Error desconocido');
      }
    } catch (error: any) {
      const retryCount = (job.retryCount || 0) + 1;
      const status = retryCount >= 5 ? 'failed' : 'pending';
      
      // Si falló definitivamente, marcar el registro local con error
      const { type, id: localId } = job.data;
      if (status === 'failed' && type === 'ADD_EXPIRY' && localId) {
        await db.cloudExpirations.update(localId, { syncStatus: 'error', syncError: error.message });
      }

      await db.syncQueue.update(job.id, { 
        status, 
        retryCount,
        createdAt: Date.now()
      });

      logger.warn("SYNC_QUEUE_RETRY", `Tarea fallida (Intento ${retryCount}): ${job.data.type} - ${error.message}`);
    }
  }
}

// Escuchar cambios de conexión para procesar la cola
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    SyncQueueService.processQueue();
  });
}
