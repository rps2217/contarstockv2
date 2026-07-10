/**
 * useEventsSync - Hook dedicado para sincronización de eventos
 *
 * Proporciona una interfaz completa para sincronizar eventos con la nube,
 * incluyendo deduplicación, stats y feedback visual.
 *
 * MEJORAS FASE 5:
 * - Cola de errores con historial
 * - Retry con backoff exponencial
 * - Historial de sincronizaciones
 * - Indicadores de estado mejorados
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { eventsSyncService, EventSyncResult } from '@/services/cloud/EventsSyncService';
import { useToastStore } from '@/stores';
import { logger } from '@/services/logger';

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

const MAX_HISTORY_ITEMS = 50;

// ============================================================================
// TIPOS
// ============================================================================

export interface EventStats {
  total: number;
  synced: number;
  pending: number;
  error: number;
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: number;
  type: 'full' | 'push' | 'pull';
  result: 'success' | 'partial' | 'failed';
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
  duration: number;
}

export interface ErrorEntry {
  id: string;
  timestamp: number;
  message: string;
  retryCount: number;
  resolved: boolean;
}

export interface UseEventsSyncOptions {
  autoSync?: boolean;
  autoSyncInterval?: number;
  retryConfig?: typeof DEFAULT_RETRY_CONFIG;
  onStart?: () => void;
  onSuccess?: (result: EventSyncResult) => void;
  onError?: (error: string) => void;
  showToasts?: boolean;
}

export interface UseEventsSyncReturn {
  syncEvents: (forceSync?: boolean) => Promise<EventSyncResult | null>;
  pushEvents: () => Promise<EventSyncResult | null>;
  pullEvents: () => Promise<void>;
  stats: EventStats | undefined;
  isSyncing: boolean;
  lastResult: EventSyncResult | null;
  lastError: string | null;
  syncHistory: SyncHistoryEntry[];
  errorQueue: ErrorEntry[];
  pause: () => void;
  resume: () => void;
  isPaused: boolean;
  lastSyncTime: number | null;
  clearHistory: () => void;
  clearErrors: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEventsSync(
  options: UseEventsSyncOptions = {}
): UseEventsSyncReturn {
  const {
    autoSync = false,
    autoSyncInterval = 60000,
    retryConfig = DEFAULT_RETRY_CONFIG,
    onStart,
    onSuccess,
    onError,
    showToasts = true,
  } = options;

  const addToast = useToastStore(state => state.addToast);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastResult, setLastResult] = useState<EventSyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [errorQueue, setErrorQueue] = useState<ErrorEntry[]>([]);

  const syncInProgress = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const calculateBackoff = useCallback((attempt: number): number => {
    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
      retryConfig.maxDelay
    );
    return delay * (0.5 + Math.random() * 0.5);
  }, [retryConfig]);

  const addToHistory = useCallback((entry: Omit<SyncHistoryEntry, 'id'>) => {
    const newEntry: SyncHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setSyncHistory(prev => [newEntry, ...prev].slice(0, MAX_HISTORY_ITEMS));
  }, []);

  const addToErrorQueue = useCallback((message: string, retryCount = 0) => {
    const errorEntry: ErrorEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message,
      retryCount,
      resolved: false,
    };
    setErrorQueue(prev => [...prev, errorEntry]);
  }, []);

  const notifyStart = useCallback(() => {
    onStart?.();
    if (showToasts) addToast('Sincronizando eventos...', 'info');
  }, [onStart, showToasts, addToast]);

  const notifySuccess = useCallback((result: EventSyncResult) => {
    onSuccess?.(result);
    setLastResult(result);
    setLastError(null);
    setLastSyncTime(Date.now());
    if (showToasts) {
      if (result.created > 0 || result.updated > 0) {
        addToast(`Eventos: ${result.created} creados, ${result.updated} actualizados`, 'success');
      } else if (result.skipped > 0) {
        addToast(`Eventos sincronizados (${result.skipped} omitidos)`, 'success');
      } else {
        addToast('Eventos: Sin cambios pendientes', 'success');
      }
    }
  }, [onSuccess, showToasts, addToast]);

  const notifyError = useCallback((error: string, retryCount = 0) => {
    onError?.(error);
    setLastError(error);
    addToErrorQueue(error, retryCount);
    logger.error('useEventsSync', 'Sync failed', error);
    if (showToasts) addToast(`Error sincronizando eventos: ${error}`, 'error');
  }, [onError, showToasts, addToast, addToErrorQueue]);

  // ============================================================================
  // STATS
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
  // SYNC (PUSH + PULL)
  // ============================================================================

  const syncEvents = useCallback(async (forceSync = false): Promise<EventSyncResult | null> => {
    if (syncInProgress.current || !navigator.onLine) return null;

    const startTime = Date.now();
    syncInProgress.current = true;
    setIsSyncing(true);
    notifyStart();

    try {
      for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
        try {
          const pushResult = await eventsSyncService.syncPendingEvents(forceSync);
          const lastSync = localStorage.getItem('lastSync_EVENTOS');
          const lastSyncTimestamp = lastSync ? parseInt(lastSync, 10) : undefined;
          const pullStats = await eventsSyncService.pullFromCloud(lastSyncTimestamp);

          localStorage.setItem('lastSync_EVENTOS', Date.now().toString());

          const result: EventSyncResult = {
            success: pushResult.success,
            created: pushResult.created + pullStats.added,
            updated: pushResult.updated + pullStats.updated,
            skipped: pushResult.skipped,
            failed: pushResult.failed,
            errors: pushResult.errors,
          };

          const duration = Date.now() - startTime;
          addToHistory({
            timestamp: Date.now(),
            type: 'full',
            result: result.success ? (result.failed > 0 ? 'partial' : 'success') : 'failed',
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            failed: result.failed,
            errors: result.errors,
            duration,
          });

          notifySuccess(result);
          return result;

        } catch (err) {
          if (attempt === retryConfig.maxRetries - 1) throw err;
          await new Promise(r => setTimeout(r, calculateBackoff(attempt)));
        }
      }
      throw new Error('Max retries exceeded');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      const duration = Date.now() - startTime;
      addToHistory({
        timestamp: Date.now(),
        type: 'full',
        result: 'failed',
        created: 0, updated: 0, skipped: 0, failed: 0,
        errors: [errorMsg],
        duration,
      });
      notifyError(errorMsg, retryConfig.maxRetries);
      return null;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [notifyStart, notifySuccess, notifyError, retryConfig, calculateBackoff, addToHistory]);

  // ============================================================================
  // PUSH ONLY
  // ============================================================================

  const pushEvents = useCallback(async (): Promise<EventSyncResult | null> => {
    if (syncInProgress.current || !navigator.onLine) return null;

    const startTime = Date.now();
    syncInProgress.current = true;
    setIsSyncing(true);
    notifyStart();

    try {
      const result = await eventsSyncService.syncPendingEvents();
      const duration = Date.now() - startTime;
      addToHistory({
        timestamp: Date.now(),
        type: 'push',
        result: result.success ? 'success' : 'failed',
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors,
        duration,
      });
      notifySuccess(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      notifyError(errorMsg, retryConfig.maxRetries);
      return null;
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [notifyStart, notifySuccess, notifyError, retryConfig, addToHistory]);

  // ============================================================================
  // PULL ONLY
  // ============================================================================

  const pullEvents = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;

    const startTime = Date.now();
    setIsSyncing(true);

    try {
      const lastSync = localStorage.getItem('lastSync_EVENTOS');
      const lastSyncTimestamp = lastSync ? parseInt(lastSync, 10) : undefined;
      const pullResult = await eventsSyncService.pullFromCloud(lastSyncTimestamp);

      localStorage.setItem('lastSync_EVENTOS', Date.now().toString());
      setLastSyncTime(Date.now());

      const duration = Date.now() - startTime;
      addToHistory({
        timestamp: Date.now(),
        type: 'pull',
        result: 'success',
        created: pullResult.added,
        updated: pullResult.updated,
        skipped: 0, failed: 0, errors: [],
        duration,
      });

      if (showToasts) {
        if (pullResult.added > 0 || pullResult.updated > 0) {
          addToast(`Eventos descargados: ${pullResult.added} nuevos, ${pullResult.updated} actualizados`, 'success');
        } else {
          addToast('Eventos: Sin cambios nuevos', 'success');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      const duration = Date.now() - startTime;
      addToHistory({
        timestamp: Date.now(),
        type: 'pull',
        result: 'failed',
        created: 0, updated: 0, skipped: 0, failed: 0,
        errors: [errorMsg],
        duration,
      });
      notifyError(errorMsg);
    } finally {
      setIsSyncing(false);
    }
  }, [showToasts, addToast, notifyError, addToHistory]);

  // ============================================================================
  // AUTO-SYNC & LISTENERS
  // ============================================================================

  useEffect(() => {
    if (!autoSync || isPaused) return;
    if (navigator.onLine && stats && stats.pending > 0) syncEvents();

    intervalRef.current = setInterval(() => {
      if (navigator.onLine && !isPaused && stats && stats.pending > 0) syncEvents();
    }, autoSyncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoSync, autoSyncInterval, isPaused, stats, syncEvents]);

  useEffect(() => {
    const handleOnline = () => { if (stats && stats.pending > 0) syncEvents(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [stats, syncEvents]);

  // ============================================================================
  // CONTROL
  // ============================================================================

  const pause = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => setIsPaused(false), []);
  const clearHistory = useCallback(() => setSyncHistory([]), []);
  const clearErrors = useCallback(() => setErrorQueue([]), []);

  return {
    syncEvents, pushEvents, pullEvents, stats, isSyncing,
    lastResult, lastError, syncHistory, errorQueue,
    pause, resume, isPaused, lastSyncTime, clearHistory, clearErrors,
  };
}

export { eventsSyncService } from '@/services/cloud/EventsSyncService';
export type { EventSyncResult } from '@/services/cloud/EventsSyncService';
