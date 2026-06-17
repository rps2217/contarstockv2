/**
 * useEventSync - Hook para sincronización de eventos con la nube
 * 
 * Maneja la sincronización bidireccional con Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { eventRepository } from '../database';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { logger, LOG_CONTEXT } from '../../../services/logger';
import { useAppStore } from '../../../store/mainAppStore';
import { useToastStore } from '../../../store/useToastStore';

export interface UseEventSyncReturn {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  syncEvents: () => Promise<void>;
  pullEvents: () => Promise<void>;
  pushEvents: () => Promise<void>;
}

/**
 * Hook para manejar sincronización de eventos
 */
export const useEventSync = (): UseEventSyncReturn => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const { settings } = useAppStore();
  const { addToast } = useToastStore.getState();
  
  const tableName = settings?.cloudConfig?.eventsTableName || 'EVENTOS';

  // Sincronización inicial al montar
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsSyncing(true);
        const { rows, error } = await supabaseSyncService.pullBatch(tableName);
        
        if (error) {
          throw new Error(error);
        }
        
        if (rows && rows.length > 0) {
          await eventRepository.bulkSave(rows.map((i: unknown) => ({ 
            ...(i as Record<string, unknown>), 
            syncStatus: 'synced' 
          })));
          logger.info(LOG_CONTEXT.SYNC, `Cargados ${rows.length} eventos desde Supabase`);
        }
        
        setLastSyncTime(Date.now());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        setSyncError(message);
        logger.error(LOG_CONTEXT.SYNC, 'Error en sincronización inicial', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchInitialData();

    // Suscripción en tiempo real
    const unsubscribe = supabaseSyncService.startSync(tableName, eventRepository);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [tableName]);

  const pullEvents = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const { rows, error } = await supabaseSyncService.pullBatch(tableName);
      
      if (error) {
        throw new Error(error);
      }
      
      if (rows && rows.length > 0) {
        await eventRepository.bulkSave(rows.map((i: unknown) => ({ 
          ...(i as Record<string, unknown>), 
          syncStatus: 'synced' 
        })));
        addToast(`${rows.length} eventos sincronizados desde la nube`, 'success');
      } else {
        addToast('No hay eventos nuevos para sincronizar', 'info');
      }
      
      setLastSyncTime(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setSyncError(message);
      logger.error(LOG_CONTEXT.SYNC, 'Error en pull de eventos', err);
      addToast('Error al sincronizar desde la nube', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, addToast]);

  const pushEvents = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const pendingEvents = await eventRepository.getByStatus('pending');
      
      if (pendingEvents.length === 0) {
        addToast('No hay eventos pendientes de subir', 'info');
        return;
      }
      
      const { success, error } = await supabaseSyncService.pushBatch(tableName, pendingEvents);
      
      if (error) {
        throw new Error(error);
      }
      
      // Marcar como sincronizados
      for (const event of pendingEvents) {
        await eventRepository.update(event.id!, { syncStatus: 'synced' });
      }
      
      addToast(`${pendingEvents.length} eventos subidos a la nube`, 'success');
      setLastSyncTime(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setSyncError(message);
      logger.error(LOG_CONTEXT.SYNC, 'Error en push de eventos', err);
      addToast('Error al subir eventos a la nube', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, addToast]);

  const syncEvents = useCallback(async (): Promise<void> => {
    await pullEvents();
    await pushEvents();
  }, [pullEvents, pushEvents]);

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    syncEvents,
    pullEvents,
    pushEvents,
  };
};
