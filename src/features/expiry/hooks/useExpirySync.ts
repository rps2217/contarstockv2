import { useState, useEffect, useCallback } from 'react';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { logger } from '../../../services/logger';
import { useToastStore } from '../../../store/useToastStore';
import { SoundFX } from '../../../services/audio';

export const useExpirySync = (tableName: string) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToastStore.getState();

  // Start real-time sync with Supabase
  useEffect(() => {
    if (!tableName) return;

    // Sincronizar nombre de tabla en el repositorio
    expiryRepository.setTableName(tableName);

    // 1. Initial Pull - Fetch existing data using the robust sync service
    const fetchInitialData = async () => {
      try {
        setIsSyncing(true);
        const { added, updated } = await genericSyncEngine.pullRemoteChanges('expiry');
        if (added > 0 || updated > 0) {
          logger.info('SYNC_INITIAL', `Sincronizados ${added + updated} registros de vencimientos`);
        }
      } catch (err) {
        logger.error('SYNC_INITIAL_FAIL', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchInitialData();

    // 2. Real-time Subscription
    const unsubscribe = supabaseSyncService.startSync(tableName, expiryRepository);
    return () => {
      unsubscribe();
    };
  }, [tableName]);

  const handleSyncExpirations = useCallback(async () => {
    try {
      setIsSyncing(true);
      const items = await expiryRepository.getAll(tableName);
      if (items.length === 0) {
        addToast('No hay registros locales para sincronizar.', 'info');
        return;
      }

      // Preparar el lote para Supabase
      const rows = items.map(item => ({
        id: item.id,
        ...item,
        syncStatus: 'synced'
      }));

      const result = await supabaseSyncService.pushBatch(tableName, rows);
      
      if (result.success) {
        // Actualizar estado local a synced
        await expiryRepository.bulkSave(items.map(i => ({ ...i, syncStatus: 'synced' })), tableName);
        addToast(`Sincronización completa: ${items.length} registros subidos.`, 'success');
        SoundFX.play('success');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      addToast(`Error al sincronizar: ${error.message}`, 'error');
      SoundFX.play('error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, addToast]);

  const handleFullRefresh = useCallback(async () => {
    try {
      localStorage.removeItem(`last_sync_${tableName}`);
      localStorage.removeItem(`lastSync_${tableName}`);
      
      // El motor de sincronización de la nube guarda el checkpoint temporal en db.settings
      const { db } = await import('../../../db');
      await db.settings.delete(`lastSync_${tableName}`);
    } catch (err) {
      console.warn("No se pudo limpiar el checkpoint en IndexedDB:", err);
    }
    window.location.reload();
  }, [tableName]);

  return {
    isSyncing,
    handleSyncExpirations,
    handleFullRefresh
  };
};
