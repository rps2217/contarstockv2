/**
 * =============================================================================
 * SYNC BRIDGE - Conecta EnhancedSyncEngine con Zustand Store
 * =============================================================================
 *
 * Proporciona una interfaz unificada para sync que:
 * - Usa EnhancedSyncEngine con retry y métricas
 * - Usa EventsSyncService para eventos (con deduplicación)
 * - Actualiza el SyncStore de Zustand
 * - Proporciona callbacks para UI
 *
 * @module SyncBridge
 */

import { enhancedSyncEngine, type EnhancedSyncResult } from './GenericSyncEngineEnhanced';
import { eventsSyncService, type EventSyncResult } from './EventsSyncService';
import { useSyncStore } from '@/stores';
import { logger } from '../logger';

// Tablas a sincronizar en orden de prioridad
export const SYNC_ORDER = [
  'products',
  'providers',
  'customers',
  'sessions',
  'expiry',
  'events',
] as const;

export type SyncTable = (typeof SYNC_ORDER)[number];

export interface SyncOptions {
  /** Tablas a sincronizar (todas por defecto) */
  tables?: SyncTable[];
  /** Llamar callback en cada tabla */
  onTableSync?: (table: SyncTable, result: EnhancedSyncResult) => void;
  /** Llamar al finalizar */
  onComplete?: (results: Record<SyncTable, EnhancedSyncResult>) => void;
  /** Llamar en error */
  onError?: (error: Error, table?: SyncTable) => void;
}

export interface SyncResult {
  success: boolean;
  results: Record<SyncTable, EnhancedSyncResult>;
  totalDuration: number;
  totalSuccess: number;
  totalFailed: number;
}

/**
 * Servicio de sync que conecta EnhancedSyncEngine con Zustand
 */
export class SyncBridge {
  private isRunning = false;

  /**
   * Sincroniza todas las tablas configuradas
   */
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning) {
      logger.warn('SyncBridge', 'Sync already in progress');
      return {
        success: false,
        results: {} as Record<string, EnhancedSyncResult>,
        totalDuration: 0,
        totalSuccess: 0,
        totalFailed: 0,
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const tables = options.tables || [...SYNC_ORDER];
    const results: Record<string, EnhancedSyncResult> = {};

    // Marcar como sincronizando
    useSyncStore.getState().setSyncing(true);
    useSyncStore.getState().setSyncError(null);

    try {
      for (const table of tables) {
        try {
          logger.info('SyncBridge', `Starting sync for ${table}`);

          // Ejecutar sync
          const result = await enhancedSyncEngine.sync(table);
          results[table] = result;

          // Actualizar store
          this.updateStore(table, result);

          // Callback por tabla
          options.onTableSync?.(table, result);

          // Si hubo error, parar o continuar según configuración
          if (!result.success && result.error) {
            logger.error('SyncBridge', `Sync failed for ${table}`, result.error);
            options.onError?.(new Error(result.error), table);
          }
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('SyncBridge', `Exception syncing ${table}`, err.message);
          results[table] = { success: false, error: err.message };
          options.onError?.(err, table);
        }
      }

      const totalDuration = Date.now() - startTime;
      const totalSuccess = Object.values(results).filter(r => r.success).length;
      const totalFailed = tables.length - totalSuccess;

      // Resultado final
      const finalResult: SyncResult = {
        success: totalFailed === 0,
        results: results as Record<SyncTable, EnhancedSyncResult>,
        totalDuration,
        totalSuccess,
        totalFailed,
      };

      options.onComplete?.(finalResult.results);

      logger.info('SyncBridge', 'Sync completed', {
        success: totalSuccess,
        failed: totalFailed,
        duration: totalDuration,
      });

      return finalResult;
    } finally {
      this.isRunning = false;
      useSyncStore.getState().setSyncing(false);
    }
  }

  /**
   * Sincroniza una tabla específica
   */
  async syncTable(table: SyncTable): Promise<EnhancedSyncResult> {
    try {
      useSyncStore.getState().setSyncing(true);

      // Usar EventsSyncService para eventos (con deduplicación)
      if (table === 'events') {
        return await this.syncEventsTable();
      }

      const result = await enhancedSyncEngine.sync(table);
      this.updateStore(table, result);

      return result;
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }

  /**
   * Sincroniza la tabla de eventos usando EventsSyncService (con deduplicación)
   */
  private async syncEventsTable(): Promise<EnhancedSyncResult> {
    try {
      // 1. Push: Subir eventos pendientes con deduplicación
      const pushResult = await eventsSyncService.syncPendingEvents();

      // 2. Pull: Descargar eventos desde la nube
      const lastSync = localStorage.getItem('lastSync_EVENTOS');
      const lastSyncTimestamp = lastSync ? parseInt(lastSync, 10) : undefined;
      const pullStats = await eventsSyncService.pullFromCloud(lastSyncTimestamp);

      // Actualizar timestamp
      localStorage.setItem('lastSync_EVENTOS', Date.now().toString());

      // Actualizar store
      this.updateStore('events', {
        success: pushResult.success,
        error: pushResult.errors.length > 0 ? pushResult.errors.join('; ') : undefined,
        pushRes: {
          success: pushResult.created + pushResult.updated,
          failed: pushResult.failed,
        },
        pullRes: {
          added: pullStats.added,
          updated: pullStats.updated,
        },
      });

      return {
        success: pushResult.success,
        error: pushResult.errors.length > 0 ? pushResult.errors.join('; ') : undefined,
        pushRes: {
          success: pushResult.created + pushResult.updated,
          failed: pushResult.failed,
        },
        pullRes: {
          added: pullStats.added,
          updated: pullStats.updated,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('SyncBridge', 'Error syncing events', errorMsg);
      return {
        success: false,
        error: errorMsg,
        pushRes: { success: 0, failed: 0 },
        pullRes: { added: 0, updated: 0 },
      };
    }
  }

  /**
   * Obtiene métricas de una tabla
   */
  getMetrics(table: SyncTable) {
    return enhancedSyncEngine.getMetrics(table);
  }

  /**
   * Verifica si hay sync en progreso
   */
  isSyncing(): boolean {
    return this.isRunning;
  }

  /**
   * Actualiza el store de Zustand con resultados
   */
  private updateStore(table: string, result: EnhancedSyncResult): void {
    const store = useSyncStore.getState();

    // Actualizar timestamp de última sync
    store.setTableSyncTime(table, Date.now());
    store.setLastSyncTime(Date.now());

    // Actualizar pending items
    if (result.pushRes) {
      const pending = store.pendingItems - result.pushRes.success + result.pushRes.failed;
      store.setPendingItems(Math.max(0, pending));
    }

    // Registrar errores
    if (!result.success && result.error) {
      store.setSyncError(result.error);
      store.addIncident(table, result.error);
    }

    // Registrar conflictos
    if (result.metrics?.conflictsResolved) {
      for (let i = 0; i < result.metrics.conflictsResolved; i++) {
        store.addConflict();
      }
    }
  }

  /**
   * Resetea el estado de sync
   */
  reset(): void {
    this.isRunning = false;
    useSyncStore.getState().setSyncing(false);
    useSyncStore.getState().setSyncError(null);
  }
}

// Singleton
export const syncBridge = new SyncBridge();

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para sincronizar con la nube
 */
export function useSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const store = useSyncStore();
  const { syncAll, isSyncing, syncTable } = syncBridge;

  const sync = useCallback(
    async (tables?: SyncTable[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await syncAll({
          tables,
          onError: (err, table) => {
            setError(err.message);
          },
        });

        if (!result.success) {
          setError(`${result.totalFailed} tabla(s) fallaron`);
        }

        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [syncAll]
  );

  return {
    sync,
    syncTable,
    isLoading,
    isSyncing: isSyncing() || store.isSyncing,
    error,
    lastSyncTime: store.lastSyncTime,
    pendingItems: store.pendingItems,
    lastSyncPerTable: store.lastSyncPerTable,
  };
}

/**
 * Hook para estado de sync de una tabla específica
 */
export function useTableSync(table: SyncTable) {
  const metrics = enhancedSyncEngine.getMetrics(table);
  const store = useSyncStore();

  return {
    lastSyncAt: store.lastSyncPerTable[table] || null,
    metrics,
    isSyncing: store.isSyncing,
  };
}
