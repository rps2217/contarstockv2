
import { useEffect, useRef } from 'react';
import * as syncManager from '../services/syncManager';
import { useToastStore } from '../store/useToastStore';
import { erpService } from '../services/erpService';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { SyncQueueService } from '../services/syncQueueService';

export const useAutoSync = () => {
  const addToast = useToastStore(state => state.addToast);
  const isSyncing = useRef(false);

  const triggerSync = async () => {
    if (isSyncing.current || !navigator.onLine) return;

    isSyncing.current = true;

    // 0. Process Expiry Sync Queue
    try {
      await SyncQueueService.processQueue();
    } catch (error) {
      console.error('Expiry sync queue processing failed:', error);
    }

    // 1. Upload pending counts
    const pendingGroups = await syncManager.getPendingUploadGroups();
    if (pendingGroups.length > 0) {
      addToast(`Sincronización automática iniciada (${pendingGroups.length} lotes)`, 'info');
      try {
        for (const group of pendingGroups) {
          await syncManager.performBatchUpload(group, () => {});
        }
        addToast('Sincronización automática completada con éxito', 'success');
      } catch (error) {
        console.error('Auto-sync failed:', error);
        addToast('Error en la sincronización automática', 'error');
      }
    }

    // 2. Download pending orders for Detective AI
    try {
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
    } catch (error: any) {
      if (error.message !== 'URL_NOT_CONFIGURED') {
        console.error('Auto-download orders failed:', error);
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
    
    // Initial check
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};
