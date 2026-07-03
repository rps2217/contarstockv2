/**
 * =============================================================================
 * SYNC BRIDGE - Conecta EnhancedSyncEngine con Zustand Store
 * =============================================================================
 * 
 * Proporciona una interfaz unificada para sync que:
 * - Usa EnhancedSyncEngine con retry y métricas
 * - Actualiza el SyncStore de Zustand
 * - Proporciona callbacks para UI
 * 
 * @module SyncBridge
 */

import { enhancedSyncEngine, type EnhancedSyncResult } from './GenericSyncEngineEnhanced';
import { useSyncStore } from '@/store/useSyncStore';
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

export type SyncTable = typeof SYNC_ORDER[number];

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
      return { success: false, results: {}, totalDuration: 0, totalSuccess: 0, totalFailed: 0 };
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

        } catch (error) {
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
        duration: totalDuration
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
      
      const result = await enhancedSyncEngine.sync(table);
      this.updateStore(table, result);
      
      return result;
    } finally {
      useSyncStore.getState().setSyncing(false);
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

  const sync = useCallback(async (tables?: SyncTable[]) => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [syncAll]);

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
