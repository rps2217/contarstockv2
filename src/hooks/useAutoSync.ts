
import { useEffect, useRef } from 'react';
import { useToastStore } from '../store/useToastStore';
import { useSyncStore } from '../store/useSyncStore';
import { erpService } from '../services/erpService';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { genericSyncEngine } from '../services/cloud/GenericSyncEngine';

/**
 * FIX: Unificada la sincronización para evitar duplicación.
 * Antes: genericSyncEngine.sync() + syncManager.performBatchUpload() = doble sync
 * Ahora: Solo genericSyncEngine.sync() que maneja todo de forma centralizada.
 */
export const useAutoSync = () => {
  const addToast = useToastStore(state => state.addToast);
  const setSyncError = useSyncStore(state => state.setSyncError);
  const isSyncing = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const triggerSync = async () => {
    if (isSyncing.current || !navigator.onLine) return;

    isSyncing.current = true;
    setSyncError(null);

    try {
      // FIX: Solo usamos el motor de sincronización genérico unificado.
      // Esto evita duplicación y conflictos entre múltiples sistemas de sync.
      const registryToSync = [
        'sessions', 
        'scans', 
        'products', 
        'providers', 
        'customers', 
        'messageTemplates', 
        'emailTemplates', 
        'expiry', 
        'events'
      ];
      
      let totalPushed = 0;
      let totalPulled = 0;
      let tablesWithErrors: string[] = [];

      for (const key of registryToSync) {
        try {
          const res = await genericSyncEngine.sync(key);
          if (res.success) {
            totalPushed += (res.pushRes?.success || 0);
            totalPulled += (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
          } else if (res.error) {
            // Solo registrar errores que no sean de tablas faltantes (son normales en dev)
            if (!res.error.includes('Table not found')) {
              tablesWithErrors.push(key);
            }
          }
        } catch (syncError: any) {
          // Continuar con otras tablas aunque una falle
          console.warn(`Sync failed for ${key}:`, syncError.message);
          tablesWithErrors.push(key);
        }
      }
      
      if (totalPushed > 0 || totalPulled > 0) {
        const msg = `Sincronización: ↑${totalPushed} ↓${totalPulled}`;
        addToast(msg, totalPulled > 0 ? 'info' : 'success');
      }

      // Descargar órdenes pendientes para Detective IA (funcionalidad separada)
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
            addToast(`Descargadas ${newOrdersCount} órdenes para Detective IA`, 'success');
          }
        }
      } catch (erpError) {
        // No fallar toda la sync por un error en ERP
        console.warn('ERP manifest download failed:', erpError);
      }
      
      if (tablesWithErrors.length > 0) {
        addToast(`Algunas tablas tuvieron errores: ${tablesWithErrors.join(', ')}`, 'warning');
      }
      
      retryCount.current = 0; // Reset on success
    } catch (error: any) {
      const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      
      const isNetworkError = errorMsg.includes('Failed to fetch') || 
                            errorMsg.includes('Cerrado por falta de red') || 
                            errorMsg.includes('offline');
      const isMissingTable = errorMsg.includes('Table not found') || 
                            errorMsg.includes('does not exist');

      if (isNetworkError) {
        // No mostrar error de red, es normal
      } else if (isMissingTable) {
        console.warn('Auto-sync table not provisioned on remote:', errorMsg);
      } else {
        console.error('Auto-sync failed:', error);
        setSyncError(errorMsg);
      }
      
      if (isNetworkError) {
        // Abort retries if it's a fundamental network reachability issue
        return;
      }

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
    
    // Sincronización periódica
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
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

