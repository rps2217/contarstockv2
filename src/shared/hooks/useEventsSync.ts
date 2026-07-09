/**
 * useEventsSync - Hook dedicado para sincronización de eventos
 * 
 * Proporciona una interfaz completa para sincronizar eventos con la nube,
 * incluyendo deduplicación, stats y feedback visual.
 * 
 * USO:
 * 
 * // Uso básico
 * const { syncEvents, stats, isSyncing } = useEventsSync();
 * 
 * // Con callbacks
 * const eventsSync = useEventsSync({
 *   onSuccess: (result) => toast.success(`${result.created} creados`),
 *   onError: (error) => toast.error(error),
 *   autoSync: true  // Sincronizar automáticamente cada 60s
 * });
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { eventsSyncService, EventSyncResult } from '@/services/cloud/EventsSyncService';
import { useToastStore } from '@/stores';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface EventStats {
  total: number;
  synced: number;
  pending: number;
  error: number;
}

export interface UseEventsSyncOptions {
  /** Sincronizar automáticamente cada interval ms */
  autoSync?: boolean;
  /** Intervalo de auto-sync en ms (default: 60000) */
  autoSyncInterval?: number;
  /** Callback al iniciar sincronización */
  onStart?: () => void;
  /** Callback al completar exitosamente */
  onSuccess?: (result: EventSyncResult) => void;
  /** Callback al error */
  onError?: (error: string) => void;
  /** Mostrar toasts automáticos (default: true) */
  showToasts?: boolean;
}

export interface UseEventsSyncReturn {
  /** Disparar sincronización manual */
  syncEvents: () => Promise<EventSyncResult | null>;
  /** Sincronizar solo subida (push) */
  pushEvents: () => Promise<EventSyncResult | null>;
  /** Sincronizar solo descarga (pull) */
  pullEvents: () => Promise<void>;
  /** Estadísticas actuales de eventos */
  stats: EventStats | undefined;
  /** Si está sincronizando actualmente */
  isSyncing: boolean;
  /** Último resultado de sincronización */
  lastResult: EventSyncResult | null;
  /** Último error */
  lastError: string | null;
  /** Pausar auto-sync */
  pause: () => void;
  /** Reanudar auto-sync */
  resume: () => void;
  /** Si auto-sync está pausado */
  isPaused: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para sincronización de eventos con deduplicación
 */
export function useEventsSync(
  options: UseEventsSyncOptions = {}
): UseEventsSyncReturn {
  const {
    autoSync = false,
    autoSyncInterval = 60000,
    onStart,
    onSuccess,
    onError,
    showToasts = true,
  } = options;

  // Stores
  const addToast = useToastStore(state => state.addToast);

  // Estado
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastResult, setLastResult] = useState<EventSyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Refs
  const syncInProgress = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // STATS EN VIVO
  // ============================================================================

  const stats = useLiveQuery(async (): Promise<EventStats> => {
    try {
      const [total, synced, pending, error] = await Promise.all([
        db.events.count(),
        db.events.where('syncStatus').equals('synced').count(),
        db.events.where('syncStatus').equals('pending').count(),
        db.events.where('syncStatus').equals('error').count(),
      ]);

      return { total, synced, pending, error };
    } catch {
      return { total: 0, synced: 0, pending: 0, error: 0 };
    }
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const notifyStart = useCallback(() => {
    onStart?.();
    if (showToasts) {
      addToast('Sincronizando eventos...', 'info');
    }
  }, [onStart, showToasts, addToast]);

  const notifySuccess = useCallback((result: EventSyncResult) => {
    onSuccess?.(result);
    setLastResult(result);
    setLastError(null);

    if (showToasts) {
      if (result.created > 0 || result.updated > 0) {
        addToast(
          `Eventos: ${result.created} creados, ${result.updated} actualizados`,
          'success'
        );
      } else if (result.skipped > 0) {
        addToast(`Eventos sincronizados (${result.skipped} omitidos)`, 'success');
      } else {
        addToast('Eventos: Sin cambios pendientes', 'success');
      }
    }
  }, [onSuccess, showToasts, addToast]);

  const notifyError = useCallback((error: string) => {
    onError?.(error);
    setLastError(error);
    logger.error('useEventsSync', 'Sync failed', error);

    if (showToasts) {
      addToast(`Error sincronizando eventos: ${error}`, 'error');
    }
  }, [onError, showToasts, addToast]);

  // ============================================================================
  // FUNCIÓN DE SYNC (PUSH + PULL)
  // ============================================================================

  const syncEvents = useCallback(async (): Promise<EventSyncResult | null> => {
    if (syncInProgress.current || !navigator.onLine) {
      return null;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    notifyStart();

    try {
      // 1. Push: Subir cambios locales
      const pushResult = await eventsSyncService.syncPendingEvents();

      // 2. Pull: Descargar cambios remotos
      const lastSync = localStorage.getItem('lastSync_EVENTOS');
      const lastSyncTimestamp = lastSync ? parseInt(lastSync, 10) : undefined;
      const pullStats = await eventsSyncService.pullFromCloud(lastSyncTimestamp);

      // Actualizar timestamp de última sync
      localStorage.setItem('lastSync_EVENTOS', Date.now().toString());

      // Construir resultado combinado
      const result: EventSyncResult = {
        success: pushResult.success,
        created: pushResult.created + pullStats.added,
        updated: pushResult.updated + pullStats.updated,
        skipped: pushResult.skipped,
        failed: pushResult.failed,
        errors: pushResult.errors,
      };

      notifySuccess(result);
      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      notifyError(errorMsg);
      return null;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [notifyStart, notifySuccess, notifyError]);

  // ============================================================================
  // FUNCIÓN PUSH ONLY
  // ============================================================================

  const pushEvents = useCallback(async (): Promise<EventSyncResult | null> => {
    if (syncInProgress.current || !navigator.onLine) {
      return null;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    notifyStart();

    try {
      const result = await eventsSyncService.syncPendingEvents();
      notifySuccess(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      notifyError(errorMsg);
      return null;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [notifyStart, notifySuccess, notifyError]);

  // ============================================================================
  // FUNCIÓN PULL ONLY
  // ============================================================================

  const pullEvents = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;

    setIsSyncing(true);
    
    try {
      const lastSync = localStorage.getItem('lastSync_EVENTOS');
      const lastSyncTimestamp = lastSync ? parseInt(lastSync, 10) : undefined;
      const stats = await eventsSyncService.pullFromCloud(lastSyncTimestamp);
      
      localStorage.setItem('lastSync_EVENTOS', Date.now().toString());
      
      if (showToasts) {
        if (stats.added > 0 || stats.updated > 0) {
          addToast(
            `Eventos descargados: ${stats.added} nuevos, ${stats.updated} actualizados`,
            'success'
          );
        } else {
          addToast('Eventos: Sin cambios nuevos', 'success');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      notifyError(errorMsg);
    } finally {
      setIsSyncing(false);
    }
  }, [showToasts, addToast, notifyError]);

  // ============================================================================
  // AUTO-SYNC
  // ============================================================================

  useEffect(() => {
    if (!autoSync || isPaused) return;

    // Sync inicial si hay pendientes
    if (navigator.onLine && stats && stats.pending > 0) {
      syncEvents();
    }

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      if (navigator.onLine && !isPaused && stats && stats.pending > 0) {
        syncEvents();
      }
    }, autoSyncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoSync, autoSyncInterval, isPaused, stats, syncEvents]);

  // ============================================================================
  // LISTENERS ONLINE/OFFLINE
  // ============================================================================

  useEffect(() => {
    const handleOnline = () => {
      if (stats && stats.pending > 0) {
        syncEvents();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [stats, syncEvents]);

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
    syncEvents,
    pushEvents,
    pullEvents,
    stats,
    isSyncing,
    lastResult,
    lastError,
    pause,
    resume,
    isPaused,
  };
}

// ============================================================================
// UTILIDADES DE EXPORT
// ============================================================================

export { eventsSyncService } from '@/services/cloud/EventsSyncService';
export type { EventSyncResult } from '@/services/cloud/EventsSyncService';
