/**
 * useExpirySync - Hook para sincronización de vencimientos
 * 
 * Usa useGenericSync como motor central para push/pull.
 * Mantiene realtime subscription para cambios en tiempo real.
 */

import { useEffect, useCallback } from 'react';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { logger } from '../../../services/logger';
import { useGenericSync } from '../../../hooks/useGenericSync';
import { db } from '../../../db';

export const useExpirySync = (tableName: string) => {
  // Usar GenericSyncEngine via useGenericSync
  const { push, pull, isSyncing } = useGenericSync({
    registryKey: 'expiry',
    tableName: tableName || 'VENCIMIENTOS',
    // Realtime ya manejado en este hook
  });

  // Sincronizar nombre de tabla en el repositorio
  useEffect(() => {
    if (tableName) {
      expiryRepository.setTableName(tableName);
    }
  }, [tableName]);

  // Initial Pull - Fetch existing data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { added, updated } = await genericSyncEngine.pullRemoteChanges('expiry');
        if (added > 0 || updated > 0) {
          logger.info('SYNC_INITIAL', `Sincronizados ${added + updated} registros de vencimientos`);
        }
      } catch (err) {
        logger.error('SYNC_INITIAL_FAIL', err);
      }
    };

    fetchInitialData();
  }, [tableName]);

  // Realtime Subscription
  useEffect(() => {
    if (!tableName) return;

    const unsubscribe = supabaseSyncService.startSync(tableName, expiryRepository);
    return () => {
      unsubscribe();
    };
  }, [tableName]);

  // Sync vencimientos pending a la nube
  const handleSyncExpirations = useCallback(async () => {
    await push();
  }, [push]);

  // Full refresh - limpia checkpoints y hace pull completo
  const handleFullRefresh = useCallback(async () => {
    try {
      localStorage.removeItem(`last_sync_${tableName}`);
      localStorage.removeItem(`lastSync_${tableName}`);
      await db.settings.delete(`lastSync_${tableName}`);
    } catch (err) {
      console.warn("No se pudo limpiar el checkpoint:", err);
    }
    // Hacer pull completo
    await pull(true);
  }, [tableName, pull]);

  return {
    isSyncing,
    handleSyncExpirations,
    handleFullRefresh
  };
};
