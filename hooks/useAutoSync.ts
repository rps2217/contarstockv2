
import { useEffect, useRef } from 'react';
import * as syncManager from '../services/syncManager';
import { useToastStore } from '../store/useToastStore';

export const useAutoSync = () => {
  const addToast = useToastStore(state => state.addToast);
  const isSyncing = useRef(false);

  const triggerSync = async () => {
    if (isSyncing.current || !navigator.onLine) return;

    const pendingGroups = await syncManager.getPendingUploadGroups();
    if (pendingGroups.length === 0) return;

    isSyncing.current = true;
    addToast(`Sincronización automática iniciada (${pendingGroups.length} lotes)`, 'info');

    try {
      for (const group of pendingGroups) {
        await syncManager.performBatchUpload(group, () => {});
      }
      addToast('Sincronización automática completada con éxito', 'success');
    } catch (error) {
      console.error('Auto-sync failed:', error);
      addToast('Error en la sincronización automática', 'error');
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      addToast('Conexión restaurada. Verificando datos pendientes...', 'info');
      triggerSync();
    };

    window.addEventListener('online', handleOnline);
    
    // Initial check
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};
