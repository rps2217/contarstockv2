import { useEffect, useRef, useCallback } from 'react';
import { unifiedSyncEngine } from '@/services/sync/unified';
import { useToastStore } from '@/stores';
import { useSyncStore } from '@/stores';
import { logger } from '@/services/logger';
import { SyncError } from '@/lib/errors';
import { withRetry } from '@/lib/retry';
import { getCircuitBreaker } from '@/lib/errors/circuitBreaker';

// Circuit breaker para proteger sync
const syncCircuitBreaker = getCircuitBreaker('auto-sync', {
  failureThreshold: 5,
  timeout: 60000, // 1 minuto
});

export const useAutoSync = () => {
  const addToast = useToastStore(state => state.addToast);
  const setSyncError = useSyncStore(state => state.setSyncError);
  const isSyncing = useRef(false);

  const handleSyncError = useCallback((error: unknown): string => {
    if (error instanceof SyncError) {
      logger.error('AutoSync', error.code, error.toJSON() as Record<string, unknown>);

      if (error.recoverable) {
        return error.message;
      }
      return '';
    }

    const errorMsg =
      error instanceof Error
        ? error.message
        : typeof error === 'object'
          ? JSON.stringify(error)
          : String(error);

    const isNetworkError =
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('Cerrado por falta de red') ||
      errorMsg.includes('offline');
    const isMissingTable =
      errorMsg.includes('Table not found') || errorMsg.includes('does not exist');

    if (isNetworkError) {
      return '';
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
      const result = await withRetry(
        () => syncCircuitBreaker.execute(() => unifiedSyncEngine.syncAll()),
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error, delay) => {
            logger.info('AutoSync', `Retry ${attempt}, esperando ${delay}ms: ${error.message}`);
          },
        }
      );

      if (result.success) {
        const uploaded = result.data?.uploaded || 0;
        const downloaded = result.data?.downloaded || 0;

        if (uploaded > 0 || downloaded > 0) {
          addToast(`Sync completada: ↑${uploaded} ↓${downloaded}`, 'success');
        }
      } else if (result.data?.errors && result.data?.errors.length > 0) {
        const visibleErrors = result.data?.errors.filter(
          e => !e.includes('Table not found') && !e.includes('does not exist')
        );
        if (visibleErrors.length > 0) {
          addToast(`Sync con errores: ${visibleErrors[0]}`, 'error');
        }
      }
    } catch (error) {
      const errorMsg = handleSyncError(error);

      if (errorMsg) {
        setSyncError(errorMsg);

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

    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        const pendingCount = useSyncStore.getState().pendingItems;
        if (pendingCount > 0) {
          logger.info('AutoSync', `Datos pendientes (${pendingCount}). Disparando sync...`);
          triggerSync();
        }
      }
    }, 60 * 1000);

    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [addToast, triggerSync]);
};
