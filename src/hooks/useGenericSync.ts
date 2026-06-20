/**
 * useGenericSync - Hook genérico para sincronización
 * 
 * Proporciona una interfaz unificada para sincronizar cualquier entidad
 * entre el repositorio local (Dexie) y Supabase.
 * 
 * @example
 * ```tsx
 * const { push, pull, isSyncing, pendingCount } = useGenericSync({
 *   tableName: 'CONTEOS',
 *   registryKey: 'counts',
 * });
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { supabaseSyncService } from '../services/supabaseSyncService';
import { genericSyncEngine } from '../services/cloud/GenericSyncEngine';
import { useToastStore } from '@/stores';
import { db } from '../db';
import { logger } from '../services/logger';

// Tipos
export interface GenericSyncConfig {
  /** Nombre de la tabla en Supabase */
  tableName: string;
  /** Clave del registry para GenericSyncEngine (opcional) */
  registryKey?: string;
  /** Usar realtime sync (default: true) */
  useRealtime?: boolean;
  /** Repositorio local para realtime sync */
  localRepository?: {
    get: (id: string) => Promise<unknown>;
    put: (row: unknown) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
}

export interface GenericSyncReturn {
  /** Si está sincronizando actualmente */
  isSyncing: boolean;
  /** Subir cambios pendientes a la nube */
  push: () => Promise<void>;
  /** Descargar cambios desde la nube */
  pull: () => Promise<void>;
  /** Sincronización bidireccional completa */
  sync: () => Promise<void>;
}

/**
 * Hook genérico para sincronización
 */
export function useGenericSync(config: GenericSyncConfig): GenericSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToastStore.getState();

  const { tableName, registryKey, useRealtime = true, localRepository } = config;

  // Realtime subscription
  useEffect(() => {
    if (!useRealtime || !localRepository || !tableName) return;

    const unsubscribe = supabaseSyncService.startSync(tableName, localRepository as any);
    return () => {
      unsubscribe();
    };
  }, [tableName, useRealtime, localRepository]);

  // Push: Subir cambios locales a la nube
  const push = useCallback(async () => {
    if (!registryKey) {
      addToast('Push no configurado sin registryKey', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await genericSyncEngine.pushIncremental(registryKey);
      
      if (result.success > 0) {
        addToast(`${result.success} registros subidos`, 'success');
      }
      if (result.failed > 0) {
        addToast(`${result.failed} registros fallaron`, 'error');
      }
      if (result.success === 0 && result.failed === 0) {
        addToast(`No hay cambios pendientes`, 'info');
      }
    } catch (err: any) {
      logger.error('GEN_SYNC_PUSH', `Error pushing to ${tableName}`, err.message);
      addToast(`Error al subir: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, registryKey, addToast]);

  // Pull: Descargar cambios desde la nube
  const pull = useCallback(async () => {
    if (!registryKey) {
      addToast('Pull no configurado sin registryKey', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      // Limpiar checkpoint para forzar refresh completo
      await db.settings.delete(`lastSync_${tableName}`);
      localStorage.removeItem(`last_sync_${tableName}`);

      const result = await genericSyncEngine.pullRemoteChanges(registryKey);
      addToast(`${result.added + result.updated} registros descargados`, 'success');
    } catch (err: any) {
      logger.error('GEN_SYNC_PULL', `Error pulling from ${tableName}`, err.message);
      addToast(`Error al descargar: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, registryKey, addToast]);

  // Sync: Sincronización bidireccional
  const sync = useCallback(async () => {
    if (!registryKey) {
      addToast('Sync no configurado sin registryKey', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await genericSyncEngine.sync(registryKey);
      
      if (result.success) {
        const { pullRes, pushRes } = result;
        addToast(
          `Sincronización completa: ${pullRes?.added + pullRes?.updated} descargados, ${pushRes?.success} subidos`,
          'success'
        );
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      logger.error('GEN_SYNC', `Error syncing ${tableName}`, err.message);
      addToast(`Error en sincronización: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, registryKey, addToast]);

  return {
    isSyncing,
    push,
    pull,
    sync,
  };
}
