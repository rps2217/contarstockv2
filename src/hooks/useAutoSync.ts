
import { useEffect, useRef, useCallback } from 'react';
import { syncOrchestrator } from '@/services/sync/SyncOrchestrator';
import { useToastStore } from '@/stores';
import { useSyncStore } from '@/stores';
import { logger } from '@/services/logger';
import { SyncError } from '@/lib/errors';
import { withRetry } from '@/lib/errors/retry';
import { getCircuitBreaker } from '@/lib/errors/circuitBreaker';

// Circuit breaker para proteger sync
const syncCircuitBreaker = getCircuitBreaker('auto-sync', {
  failureThreshold: 5,
  timeout: 60000 // 1 minuto
});

export const useAutoSync = () => {
  const addToast = useToastStore(state => state.addToast);
  const setSyncError = useSyncStore(state => state.setSyncError);
  const isSyncing = useRef(false);

  const handleSyncError = useCallback((error: unknown): string => {
    // Usar el nuevo sistema de errores tipados
    if (error instanceof SyncError) {
      logger.error('AutoSync', error.code, error.toJSON() as Record<string, unknown>);
      
      // Errores recuperables con retry implícito
      if (error.recoverable) {
        return error.message;
      }
      return ''; // Error no recuperable, no mostrar
    }
    
    // Fallback para errores legacy
    const errorMsg = error instanceof Error ? error.message : 
                     typeof error === 'object' ? JSON.stringify(error) : String(error);
    
    const isNetworkError = errorMsg.includes('Failed to fetch') || 
                           errorMsg.includes('Cerrado por falta de red') || 
                           errorMsg.includes('offline');
    const isMissingTable = errorMsg.includes('Table not found') || 
                           errorMsg.includes('does not exist');

    if (isNetworkError) {
      return ''; // Silenciar errores de red
    } else if (isMissingTable) {
      logger.warn('AutoSync', `Tabla no provista en remoto: ${errorMsg}`);
      return '';
    } else {
      logger.error('AutoSync', `Sincronizacion fallida: ${error}`);
      return errorMsg;
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing.current || !navigator.onLine) return;

    isSyncing.current = true;
    setSyncError(null);

    try {
      // Usar retry con exponential backoff
      const result = await withRetry(
        () => syncCircuitBreaker.execute(() => syncOrchestrator.syncAll((msg) => {
          logger.info('AutoSync', msg);
        })),
        { 
          maxRetries: 3, 
          baseDelay: 1000,
          onRetry: (attempt, error, delay) => {
            logger.info('AutoSync', `Retry ${attempt}, esperando ${delay}ms: ${error.message}`);
          }
        }
      );
      
      // Mostrar resultados
      if (result.success) {
        const { catalogSync, batchSync, ordersDownloaded } = result;
        
        const pushedItems = (catalogSync?.products || 0) + 
                          (catalogSync?.providers || 0) + 
                          (catalogSync?.sessions || 0);
        const pulledItems = (catalogSync?.scans || 0);
        
        if (pushedItems > 0 || pulledItems > 0) {
          addToast(`Sync completada: ↑${pushedItems} ↓${pulledItems}`, 'success');
        }
        
        if (batchSync?.uploaded) {
          addToast(`${batchSync.uploaded} lotes subidos`, 'success');
        }
        
        if (ordersDownloaded && ordersDownloaded > 0) {
          addToast(`${ordersDownloaded} órdenes descargadas para Detective IA`, 'success');
        }
      } else if (result.errors && result.errors.length > 0) {
        // Solo mostrar errores no silenciados
        const visibleErrors = result.errors.filter(e => 
          !e.includes('Table not found') && !e.includes('does not exist')
        );
        if (visibleErrors.length > 0) {
          addToast(`Sync con errores: ${visibleErrors[0]}`, 'error');
        }
      }
    } catch (error) {
      const errorMsg = handleSyncError(error);
      
      if (errorMsg) {
        setSyncError(errorMsg);
        
        // Si el circuit breaker está abierto, informar al usuario
        if (error instanceof SyncError && error.code === 'SYNC_CIRCUIT_OPEN') {
          addToast('Demasiados errores de sincronización. Reintentando en breve...', 'warning');
        } else {
          addToast('Error persistente en sincronización automática', 'error');
        }
      }
    } finally {
      isSyncing.current = false;
    }
  }, [addToast, setSyncError, handleSyncError]);

  useEffect(() => {
    const handleOnline = () => {
      addToast('Conexión restaurada. Verificando datos pendientes...', 'info');
      triggerSync();
    };

    window.addEventListener('online', handleOnline);
    
    // Sincronización periódica cada minuto
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        const pendingCount = useSyncStore.getState().pendingItems;
        if (pendingCount > 0) {
          logger.info('AutoSync', `Datos pendientes (${pendingCount}). Disparando sync...`);
          triggerSync();
        }
      }
    }, 60 * 1000);
    
    // Initial check
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [addToast, triggerSync]);
};

