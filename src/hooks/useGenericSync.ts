/**
 * useGenericSync - Hook genérico para sincronización
 *
 * ⚠️ DEPRECATED: Usar `useSync` de `@/shared/hooks` para sincronización global
 * o `genericSyncEngine` directamente para operaciones específicas por tabla.
 *
 * Proporciona una interfaz unificada para sincronizar cualquier entidad
 * entre el repositorio local (Dexie) y Supabase.
 *
 * @deprecated Usar:
 * - `useSync({ mode: 'auto' })` para sincronización global automática
 * - `genericSyncEngine.sync(key)` para sincronizar una tabla específica
 * - `genericSyncEngine.pushIncremental(key)` para subir cambios
 * - `genericSyncEngine.pullRemoteChanges(key)` para descargar cambios
 *
 * @example Migración a useSync:
 * ```tsx
 * // ANTES (deprecated)
 * const { push, pull } = useGenericSync({ registryKey: 'products' });
 *
 * // DESPUÉS (recomendado)
 * const { triggerSync } = useSync({ mode: 'manual' });
 * ```
 *
 * @example Usar genericSyncEngine directamente:
 * ```tsx
 * import { genericSyncEngine } from '@/services/cloud/GenericSyncEngine';
 *
 * // Push cambios locales
 * const result = await genericSyncEngine.pushIncremental('products');
 *
 * // Pull cambios remotos
 * const changes = await genericSyncEngine.pullRemoteChanges('products');
 *
 * // Sync bidireccional completo
 * const syncResult = await genericSyncEngine.sync('products');
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { supabaseSyncService } from '../services/supabaseSyncService';
import { genericSyncEngine } from '../services/cloud/GenericSyncEngine';
import { useToastStore } from '@/stores';
import { db } from '../db';
import { logger } from '../services/logger';

// =============================================================================
// TIPOS
// =============================================================================

export interface GenericSyncConfig {
  /** Clave del registry para GenericSyncEngine (requerido) */
  registryKey: string;
  /** Nombre de la tabla en Supabase (para logging) */
  tableName?: string;
  /** Usar realtime sync (default: true) */
  useRealtime?: boolean;
  /** Repositorio local para realtime sync */
  localRepository?: {
    get: (id: string) => Promise<unknown>;
    put: (row: unknown) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  /** Callback opcional cuando sync es exitoso */
  onSuccess?: (message: string) => void;
  /** Callback opcional cuando hay error */
  onError?: (message: string) => void;
  /** Callback opcional para cada operación individual */
  onProgress?: (operation: 'push' | 'pull', count: number) => void;
}

export interface GenericSyncReturn {
  /** Si está sincronizando actualmente */
  isSyncing: boolean;
  /** Subir cambios pendientes a la nube */
  push: () => Promise<{ success: number; failed: number }>;
  /** Descargar cambios desde la nube */
  pull: (forceFullRefresh?: boolean) => Promise<{ added: number; updated: number }>;
  /** Sincronización bidireccional completa */
  sync: () => Promise<{ success: boolean; error?: string }>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook genérico para sincronización bidireccional.
 *
 * Usa GenericSyncEngine como motor central y syncRegistry para configuración.
 */
export function useGenericSync(config: GenericSyncConfig): GenericSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToastStore.getState();

  const {
    registryKey,
    tableName,
    useRealtime = false, // Por defecto desactivado para evitar duplicación
    localRepository,
    onSuccess,
    onError,
    onProgress,
  } = config;

  // Realtime subscription (opcional)
  useEffect(() => {
    if (!useRealtime || !localRepository || !tableName) return;

    const unsubscribe = supabaseSyncService.startSync(tableName, localRepository as any);
    return () => {
      unsubscribe();
    };
  }, [tableName, useRealtime, localRepository]);

  // Helper para notificar éxito/error
  const notifySuccess = useCallback(
    (msg: string) => {
      if (onSuccess) onSuccess(msg);
      else addToast(msg, 'success');
    },
    [onSuccess, addToast]
  );

  const notifyError = useCallback(
    (msg: string) => {
      if (onError) onError(msg);
      else addToast(msg, 'error');
    },
    [onError, addToast]
  );

  // Push: Subir cambios locales a la nube
  const push = useCallback(async () => {
    if (!registryKey) {
      const msg = 'Push no configurado sin registryKey';
      notifyError(msg);
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await genericSyncEngine.pushIncremental(registryKey);

      if (result.success > 0) {
        const msg = `${result.success} registros subidos`;
        notifySuccess(msg);
        onProgress?.('push', result.success);
      }
      if (result.failed > 0) {
        const msg = `${result.failed} registros fallaron`;
        notifyError(msg);
      }
      if (result.success === 0 && result.failed === 0) {
        notifySuccess('No hay cambios pendientes');
      }

      return result;
    } catch (err: unknown) {
      logger.error(
        'GEN_SYNC_PUSH',
        `Error pushing ${registryKey}`,
        err instanceof Error ? err.message : String(err)
      );
      notifyError(`Error al subir: ${err instanceof Error ? err.message : String(err)}`);
      return { success: 0, failed: 1 };
    } finally {
      setIsSyncing(false);
    }
  }, [registryKey, notifySuccess, notifyError, onProgress]);

  // Pull: Descargar cambios desde la nube
  const pull = useCallback(
    async (forceFullRefresh = false) => {
      if (!registryKey) {
        const msg = 'Pull no configurado sin registryKey';
        notifyError(msg);
        return { added: 0, updated: 0 };
      }

      setIsSyncing(true);
      try {
        // Limpiar checkpoint para forzar refresh completo si se solicita
        if (forceFullRefresh && tableName) {
          await db.settings.delete(`lastSync_${tableName}`);
          localStorage.removeItem(`last_sync_${tableName}`);
        }

        const result = await genericSyncEngine.pullRemoteChanges(registryKey);
        const total = result.added + result.updated;

        if (total > 0) {
          const msg = `${total} registros descargados`;
          notifySuccess(msg);
          onProgress?.('pull', total);
        } else {
          notifySuccess('No hay cambios nuevos');
        }

        return result;
      } catch (err: unknown) {
        logger.error(
          'GEN_SYNC_PULL',
          `Error pulling ${registryKey}`,
          err instanceof Error ? err.message : String(err)
        );
        notifyError(`Error al descargar: ${err instanceof Error ? err.message : String(err)}`);
        return { added: 0, updated: 0 };
      } finally {
        setIsSyncing(false);
      }
    },
    [registryKey, tableName, notifySuccess, notifyError, onProgress]
  );

  // Sync: Sincronización bidireccional
  const sync = useCallback(async () => {
    if (!registryKey) {
      const msg = 'Sync no configurado sin registryKey';
      notifyError(msg);
      return { success: false, error: msg };
    }

    setIsSyncing(true);
    try {
      const result = await genericSyncEngine.sync(registryKey);

      if (result.success) {
        const { pullRes, pushRes } = result;
        const totalPull = (pullRes?.added ?? 0) + (pullRes?.updated ?? 0);
        const totalPush = pushRes?.success || 0;

        const msg = `Sync: ${totalPull}↓ ${totalPush}↑`;
        notifySuccess(msg);
      } else {
        throw new Error(result.error);
      }

      return result;
    } catch (err: unknown) {
      logger.error(
        'GEN_SYNC',
        `Error syncing ${registryKey}`,
        err instanceof Error ? err.message : String(err)
      );
      notifyError(`Error en sync: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      setIsSyncing(false);
    }
  }, [registryKey, notifySuccess, notifyError]);

  return {
    isSyncing,
    push,
    pull,
    sync,
  };
}
