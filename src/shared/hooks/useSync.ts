/**
 * useSync - Hook unificado de sincronización
 *
 * Combina: useAutoSync, useGenericSync, useSyncQueue, useScheduledSync, useRealtimeSync
 *
 * USO:
 *
 * // Modo automático (default)
 * const { triggerSync, isSyncing, pendingCount } = useSync();
 *
 * // Modo manual con opciones
 * const sync = useSync({
 *   mode: 'manual',
 *   autoRetry: true,
 *   onSuccess: (result) => console.log(result),
 *   onError: (error) => console.error(error)
 * });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { unifiedSyncEngine } from '@/services/sync/unified';
import { useSyncStore } from '@/store/useSyncStore';
import { useToastStore } from '@/stores';
import { logger } from '@/services/logger';
import { SyncError } from '@/lib/errors';
import { withRetry } from '@/lib/retry';
import { getCircuitBreaker } from '@/lib/errors/circuitBreaker';
import type { SyncResult } from '@/services/sync/unified';

// ============================================================================
// TIPOS
// ============================================================================

export type SyncMode = 'auto' | 'manual' | 'scheduled' | 'realtime';

export interface UseSyncOptions {
  /** Modo de sincronización */
  mode?: SyncMode;
  /** Intervalo en ms para modo scheduled (default: 60000) */
  interval?: number;
  /** Habilitar retry automático */
  autoRetry?: boolean;
  /** Número máximo de reintentos */
  maxRetries?: number;
  /** Callback al iniciar sync */
  onStart?: () => void;
  /** Callback al completar sync */
  onSuccess?: (result: SyncResult) => void;
  /** Callback al error */
  onError?: (error: SyncError) => void;
  /** Callback de progreso */
  onProgress?: (message: string) => void;
  /** Habilitar circuit breaker */
  circuitBreaker?: boolean;
}

export interface UseSyncReturn {
  /** Disparar sincronización manual */
  triggerSync: () => Promise<SyncResult | null>;
  /** Si está sincronizando actualmente */
  isSyncing: boolean;
  /** Cantidad de items pendientes */
  pendingCount: number;
  /** Último error de sync */
  lastError: string | null;
  /** Tiempo del último sync exitoso */
  lastSyncTime: number | null;
  /** Pausar sincronización automática */
  pause: () => void;
  /** Reanudar sincronización automática */
  resume: () => void;
  /** Si está pausado */
  isPaused: boolean;
}

// ============================================================================
// CIRCUIT BREAKER COMPARTIDO
// ============================================================================

const syncCircuitBreaker = getCircuitBreaker('shared-sync', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
});

// ============================================================================
// HOOK
// ============================================================================

export function useSync(options: UseSyncOptions = {}): UseSyncReturn {
  const {
    mode = 'auto',
    interval = 60000,
    autoRetry = true,
    maxRetries = 3,
    onStart,
    onSuccess,
    onError,
    onProgress,
    circuitBreaker = true,
  } = options;

  // Stores
  const setSyncError = useSyncStore(state => state.setSyncError);
  const addToast = useToastStore(state => state.addToast);

  // Estado local
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Refs
  const syncInProgress = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pending count del store
  const pendingCount = useSyncStore(state => state.pendingItems);

  // ============================================================================
  // FUNCIÓN DE SYNC
  // ============================================================================

  const executeSync = useCallback(async (): Promise<SyncResult | null> => {
    if (syncInProgress.current || !navigator.onLine) return null;

    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncError(null);
    onStart?.();

    try {
      // Construir función de sync con opciones
      const syncFn = async () => {
        const result = await unifiedSyncEngine.syncAll();

        return result;
      };

      // Ejecutar con retry y circuit breaker si está habilitado
      let result: SyncResult;

      if (circuitBreaker) {
        result = await syncCircuitBreaker.execute(syncFn);
      } else if (autoRetry) {
        result = await withRetry(syncFn, {
          maxRetries,
          baseDelay: 1000,
          onRetry: (attempt, error, delay) => {
            logger.info('useSync', `Retry ${attempt}, esperando ${delay}ms`);
          },
        });
      } else {
        result = await syncFn();
      }

      // Procesar resultado
      if (result.success) {
        setLastSyncTime(Date.now());
        setLastError(null);
        onSuccess?.(result);
      } else if (result.errors?.length) {
        const visibleErrors = result.errors.filter(
          e => !e.includes('Table not found') && !e.includes('does not exist')
        );
        if (visibleErrors.length > 0) {
          setLastError(visibleErrors[0]);
          addToast(`Sync: ${visibleErrors[0]}`, 'error');
        }
      }

      return result;
    } catch (error) {
      let errorMsg = 'Error de sincronización';

      if (error instanceof SyncError) {
        errorMsg = error.message;
        logger.error('useSync', error.code, error.toJSON() as Record<string, unknown>);
        onError?.(error);

        if (error.code === 'SYNC_CIRCUIT_OPEN') {
          addToast('Demasiados errores. Reintentando en breve...', 'warning');
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      setLastError(errorMsg);
      setSyncError(errorMsg);
      return null;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [
    autoRetry,
    circuitBreaker,
    maxRetries,
    onError,
    onProgress,
    onStart,
    onSuccess,
    setSyncError,
    addToast,
  ]);

  // ============================================================================
  // MODO MANUAL
  // ============================================================================

  const triggerSync = useCallback(async () => {
    return executeSync();
  }, [executeSync]);

  // ============================================================================
  // MODO AUTO / SCHEDULED
  // ============================================================================

  useEffect(() => {
    if (mode === 'manual' || isPaused) return;

    // Sync inicial con timeout para evitar setState sincrono en effect
    let initialSyncTimeout: ReturnType<typeof setTimeout> | null = null;

    if (navigator.onLine) {
      initialSyncTimeout = setTimeout(() => {
        executeSync();
      }, 0);
    }

    // Configurar intervalo para modo scheduled
    if (mode === 'scheduled' || mode === 'auto') {
      intervalRef.current = setInterval(() => {
        if (navigator.onLine && !isPaused) {
          const pending = useSyncStore.getState().pendingItems;
          if (pending > 0 || mode === 'scheduled') {
            executeSync();
          }
        }
      }, interval);
    }

    return () => {
      if (initialSyncTimeout) {
        clearTimeout(initialSyncTimeout);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mode, interval, isPaused, executeSync]);

  // ============================================================================
  // MODO REALTIME - Escuchar eventos online/offline
  // ============================================================================

  useEffect(() => {
    if (mode !== 'realtime' || isPaused) return;

    const handleOnline = () => {
      addToast('Conexión restaurada. Sincronizando...', 'info');
      executeSync();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [mode, isPaused, executeSync, addToast]);

  // ============================================================================
  // CONTROL DE PAUSA
  // ============================================================================

  const pause = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    triggerSync,
    isSyncing,
    pendingCount,
    lastError,
    lastSyncTime,
    pause,
    resume,
    isPaused,
  };
}

// ============================================================================
// HOOKS ESPECÍFICOS (mantienen compatibilidad hacia atrás)
// ============================================================================

/**
 * @deprecated Usar useSync({ mode: 'auto' }) en su lugar
 */
export const useAutoSyncLegacy = () => useSync({ mode: 'auto' });

/**
 * @deprecated Usar useSync({ mode: 'manual' }) en su lugar
 */
export const useManualSync = () => useSync({ mode: 'manual' });

/**
 * @deprecated Usar useSync({ mode: 'scheduled', interval: X }) en su lugar
 */
export const useScheduledSyncLegacy = (interval = 60000) =>
  useSync({ mode: 'scheduled', interval });

// Re-exportar SyncBridge para uso directo
export { syncBridge, SYNC_ORDER, type SyncTable } from '@/services/cloud/SyncBridge';
export { useSync as useEnhancedSync, useTableSync } from '@/services/cloud/SyncBridge';
