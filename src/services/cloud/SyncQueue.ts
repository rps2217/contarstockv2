/**
 * =============================================================================
 * SYNC QUEUE - Cola de Operaciones Offline
 * =============================================================================
 *
 * Maneja operaciones que deben sincronizarse cuando hay conexión.
 * Garantiza que ninguna operación se pierda aunque la app se cierre.
 *
 * ARQUITECTURA:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      OPERACIONES                               │
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
 * │  │ CREATE  │  │ UPDATE   │  │ DELETE  │  │  ...    │         │
 * │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
 * │       │              │              │              │           │
 * │       └──────────────┴──────────────┴──────────────┘         │
 * │                           │                                   │
 * │                           ▼                                   │
 * │                   ┌──────────────┐                           │
 * │                   │  SyncQueue   │ ← Persisted in IndexedDB  │
 * │                   │  (Dexie)     │                           │
 * │                   └──────┬───────┘                           │
 * │                          │                                    │
 * │         ┌────────────────┼────────────────┐                   │
 * │         │                │                 │                   │
 * │         ▼                ▼                 ▼                   │
 * │   ┌──────────┐   ┌──────────┐    ┌──────────────┐          │
 * │   │ Online   │   │ Offline  │    │   Process    │          │
 * │   │ Monitor  │   │ Store    │───►│   Worker     │          │
 * │   └──────────┘   └──────────┘    └──────┬───────┘          │
 * │                                         │                    │
 * │                                         ▼                    │
 * │                                 ┌──────────────┐          │
 * │                                 │  Generic     │          │
 * │                                 │  SyncEngine  │          │
 * │                                 └──────┬───────┘          │
 * │                                        │                    │
 * │                                        ▼                    │
 * │                                 ┌──────────────┐          │
 * │                                 │  Supabase    │          │
 * │                                 └──────────────┘          │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @module SyncQueue
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { logger } from '../logger';

// =============================================================================
// TIPOS
// =============================================================================

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncQueueStatus = 'queued' | 'processing' | 'synced' | 'failed' | 'cancelled';

export interface SyncQueueItem {
  /** ID único del item en la cola */
  id: string;
  /** Nombre de la tabla (local) */
  tableName: string;
  /** Registry key para sync */
  registryKey: string;
  /** ID del registro */
  recordId: string;
  /** Operación a realizar */
  operation: SyncOperation;
  /** Datos del registro */
  data: Record<string, unknown>;
  /** Timestamp cuando se creó el item */
  createdAt: number;
  /** Timestamp de la última modificación del registro */
  recordUpdatedAt: number;
  /** Número de intentos de sync */
  retryCount: number;
  /** Estado actual en la cola */
  status: SyncQueueStatus;
  /** Último error (si falló) */
  lastError?: string;
  /** Timestamp del último intento */
  lastAttemptAt?: number;
}

export interface SyncQueueStats {
  pending: number;
  processing: number;
  failed: number;
  total: number;
}

// =============================================================================
// DATABASE SCHEMA
// =============================================================================

interface SyncQueueDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-table': string;
      'by-status': string;
      'by-created': number;
      'by-record': [string, string]; // [tableName, recordId]
    };
  };
  syncMetadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'SyncQueueDB';
const DB_VERSION = 1;

// =============================================================================
// SYNC QUEUE CLASS
// =============================================================================

class SyncQueueManager {
  private db: IDBPDatabase<SyncQueueDB> | null = null;
  private isProcessing = false;
  private isOnline = navigator.onLine;
  private processorInterval: ReturnType<typeof setInterval> | null = null;

  // Referencias a handlers para cleanup
  private onlineHandler = () => this.handleOnline();
  private offlineHandler = () => this.handleOffline();

  /**
   * Inicializa la cola de sync
   */
  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<SyncQueueDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Tabla principal de cola
          if (!db.objectStoreNames.contains('syncQueue')) {
            const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
            queueStore.createIndex('by-table', 'tableName');
            queueStore.createIndex('by-status', 'status');
            queueStore.createIndex('by-created', 'createdAt');
            queueStore.createIndex('by-record', ['tableName', 'recordId']);
          }

          // Metadata para tracking
          if (!db.objectStoreNames.contains('syncMetadata')) {
            db.createObjectStore('syncMetadata', { keyPath: 'key' });
          }
        },
      });

      // Escuchar eventos de online/offline
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);

      // Iniciar procesador
      this.startProcessor();

      logger.info('SyncQueue', 'Initialized');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('SyncQueue', 'Failed to initialize', error.message);
      throw error;
    }
  }

  /**
   * Añade una operación a la cola
   */
  async enqueue(
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status' | 'lastAttemptAt'>
  ): Promise<string> {
    await this.ensureDb();

    const id = `${item.tableName}_${item.recordId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queueItem: SyncQueueItem = {
      ...item,
      id,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'queued',
    };

    await this.db!.put('syncQueue', queueItem);

    logger.info('SyncQueue', `Enqueued: ${item.operation} on ${item.tableName}/${item.recordId}`);

    // Intentar procesar inmediatamente si estamos online
    if (this.isOnline) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Obtiene el siguiente item pendiente
   */
  async dequeue(): Promise<SyncQueueItem | undefined> {
    await this.ensureDb();

    const items = await this.db!.getAllFromIndex('syncQueue', 'by-status', 'queued');

    // Ordenar por createdAt (FIFO)
    items.sort((a, b) => a.createdAt - b.createdAt);

    // Marcar como processing
    if (items.length > 0) {
      const item = items[0];
      item.status = 'processing';
      item.lastAttemptAt = Date.now();
      await this.db!.put('syncQueue', item);
      return item;
    }

    return undefined;
  }

  /**
   * Marca un item como completado
   */
  async markSynced(id: string): Promise<void> {
    await this.ensureDb();

    const item = await this.db!.get('syncQueue', id);
    if (item) {
      item.status = 'synced';
      await this.db!.put('syncQueue', item);

      // Remover después de un delay para debugging
      setTimeout(async () => {
        await this.db?.delete('syncQueue', id);
      }, 60000); // 1 minuto

      logger.info('SyncQueue', `Synced: ${id}`);
    }
  }

  /**
   * Marca un item como fallido
   */
  async markFailed(id: string, error: string): Promise<void> {
    await this.ensureDb();

    const item = await this.db!.get('syncQueue', id);
    if (item) {
      item.status = item.retryCount >= 5 ? 'failed' : 'queued';
      item.lastError = error;
      item.retryCount++;
      await this.db!.put('syncQueue', item);

      logger.warn('SyncQueue', `Failed: ${id} (attempt ${item.retryCount}): ${error}`);
    }
  }

  /**
   * Cancela un item
   */
  async cancel(id: string): Promise<void> {
    await this.ensureDb();

    const item = await this.db!.get('syncQueue', id);
    if (item) {
      item.status = 'cancelled';
      await this.db!.put('syncQueue', item);

      // Remover después de un delay
      setTimeout(async () => {
        await this.db?.delete('syncQueue', id);
      }, 5000);
    }
  }

  /**
   * Obtiene estadísticas de la cola
   */
  async getStats(): Promise<SyncQueueStats> {
    await this.ensureDb();

    const all = await this.db!.getAll('syncQueue');

    return {
      pending: all.filter(i => i.status === 'queued').length,
      processing: all.filter(i => i.status === 'processing').length,
      failed: all.filter(i => i.status === 'failed').length,
      total: all.length,
    };
  }

  /**
   * Obtiene todos los items de una tabla
   */
  async getByTable(tableName: string): Promise<SyncQueueItem[]> {
    await this.ensureDb();
    return this.db!.getAllFromIndex('syncQueue', 'by-table', tableName);
  }

  /**
   * Limpia items antiguos o completados
   */
  async cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    await this.ensureDb();

    const cutoff = Date.now() - olderThanMs;
    const all = await this.db!.getAll('syncQueue');
    let removed = 0;

    for (const item of all) {
      if ((item.status === 'synced' || item.status === 'cancelled') && item.createdAt < cutoff) {
        await this.db!.delete('syncQueue', item.id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Retry todos los items fallidos
   */
  async retryFailed(): Promise<void> {
    await this.ensureDb();

    const failed = await this.db!.getAllFromIndex('syncQueue', 'by-status', 'failed');

    for (const item of failed) {
      item.status = 'queued';
      item.retryCount = 0;
      item.lastError = undefined;
      await this.db!.put('syncQueue', item);
    }

    logger.info('SyncQueue', `Retrying ${failed.length} failed items`);
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  private handleOnline(): void {
    logger.info('SyncQueue', 'Online - processing queue');
    this.isOnline = true;
    this.processQueue();
  }

  private handleOffline(): void {
    logger.info('SyncQueue', 'Offline - pausing queue');
    this.isOnline = false;
  }

  private startProcessor(): void {
    // Procesar cada 5 segundos cuando online
    this.processorInterval = setInterval(() => {
      if (this.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    }, 5000);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) return;

    this.isProcessing = true;

    try {
      const item = await this.dequeue();

      if (!item) {
        this.isProcessing = false;
        return;
      }

      // Emitir evento para que el sync engine procese
      window.dispatchEvent(new CustomEvent('sync:process', { detail: item }));
    } catch (error: unknown) {
      logger.error('SyncQueue', 'Processing error', String(error));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Destruye la conexión a la DB y limpia recursos
   */
  async destroy(): Promise<void> {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }

    // Limpiar event listeners
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton
export const syncQueue = new SyncQueueManager();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Encola una operación de sync
 */
export async function enqueueSync(
  tableName: string,
  registryKey: string,
  recordId: string,
  operation: SyncOperation,
  data: Record<string, unknown>,
  recordUpdatedAt?: number
): Promise<string> {
  return syncQueue.enqueue({
    tableName,
    registryKey,
    recordId,
    operation,
    data,
    recordUpdatedAt: recordUpdatedAt || Date.now(),
  });
}

/**
 * Obtiene estadísticas de sync
 */
export async function getSyncQueueStats(): Promise<SyncQueueStats> {
  return syncQueue.getStats();
}
