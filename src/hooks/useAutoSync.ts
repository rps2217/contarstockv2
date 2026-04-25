
import { useEffect, useRef } from 'react';
import * as syncManager from '../services/syncManager';
import { useToastStore } from '../store/useToastStore';
import { useSyncStore } from '../store/useSyncStore';
import { erpService } from '../services/erpService';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { dynamicSyncService } from '../services/dynamicSync';

export const useAutoSync = () => {
  const addToast = useToastStore(state => state.addToast);
  const { setSyncError } = useSyncStore();
  const isSyncing = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const triggerSync = async () => {
    if (isSyncing.current || !navigator.onLine) return;

    isSyncing.current = true;
    setSyncError(null);

    try {
      // 0. Process Dynamic Data Sync
      await dynamicSyncService.resetRetries();
      const dynamicResult = await dynamicSyncService.syncAllPending();
      if (dynamicResult.success > 0) {
        addToast(`Sincronización dinámica: ${dynamicResult.success} registros enviados`, 'success');
      }

      // 1. Upload pending counts
      const pendingGroups = await syncManager.getPendingUploadGroups();
      if (pendingGroups.length > 0) {
        addToast(`Sincronización automática iniciada (${pendingGroups.length} lotes)`, 'info');
        for (const group of pendingGroups) {
          await syncManager.performBatchUpload(group, () => {});
        }
        addToast('Sincronización automática completada con éxito', 'success');
      }

      // 2. Download pending orders for Detective IA
      const manifests = await erpService.downloadAllPendingManifests();
      if (manifests.length > 0) {
        let newOrdersCount = 0;
        for (const manifest of manifests) {
          const existing = await ExpectedOrderRepository.getById(manifest.id);
          if (!existing) {
            const items = manifest.items?.map((p: any) => ({
              barcode: p.barcode,
              name: p.name,
              expectedQty: p.qty
            })) || [];

            await ExpectedOrderRepository.save({
              id: manifest.id,
              internalId: manifest.id,
              items,
              totalExpectedUnits: items.reduce((acc, i) => acc + i.expectedQty, 0),
              totalExpectedSKUs: items.length,
              importedAt: Date.now()
            });
            newOrdersCount++;
          }
        }
        if (newOrdersCount > 0) {
          addToast(`Se descargaron ${newOrdersCount} nuevas órdenes para el Detective IA`, 'success');
        }
      }
      
      retryCount.current = 0; // Reset on success
    } catch (error: any) {
      const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error('Auto-sync failed:', error);
      setSyncError(errorMsg);
      
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        const delay = Math.pow(2, retryCount.current) * 1000;
        console.log(`[AutoSync] Reintentando en ${delay}ms... (Intento ${retryCount.current})`);
        setTimeout(triggerSync, delay);
      } else {
        addToast('Error persistente en sincronización automática', 'error');
      }
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
    
    // Sincronización periódica más frecuente si hay datos pendientes
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        // Si hay datos pendientes, sincronizar cada minuto, si no, cada 5 minutos
        const pendingCount = useSyncStore.getState().pendingItems;
        if (pendingCount > 0) {
          console.log(`[AutoSync] Datos pendientes (${pendingCount}). Disparando sync...`);
          triggerSync();
        }
      }
    }, 60 * 1000); // Revisar cada minuto
    
    // Initial check
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, []);
};

// Forced GitHub sync
