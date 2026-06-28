/**
 * useSyncQueue - Hook para integrar cola de sincronización offline
 * 
 * ⚠️ DEPRECATED: La funcionalidad de cola offline ahora está integrada
 * en SyncOrchestrator y useSync. Usar useSync para casos generales.
 * 
 * Este hook permanece para uso interno del sistema de sync queue
 * y para casos que requieren control granular de la cola.
 * 
 * @deprecated Usar `useSync({ mode: 'auto' })` para sincronización automática
 * con cola offline integrada.
 */

import { useEffect, useState, useCallback } from 'react';
import { syncQueueService, type QueuedOperation } from '@/services/cloud/SyncQueueService';
import { useSyncStore } from '@/stores';

export interface SyncQueueStats {
  total: number;
  pending: number;
  failed: number;
  byTable: Record<string, number>;
}

export function useSyncQueue() {
  const [stats, setStats] = useState<SyncQueueStats>({
    total: 0,
    pending: 0,
    failed: 0,
    byTable: {}
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addIncident } = useSyncStore();

  // Refrescar estadísticas
  const refreshStats = useCallback(async () => {
    const newStats = await syncQueueService.getStats();
    setStats(newStats);
  }, []);

  // Encolar operación
  const enqueue = useCallback(async (
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    recordId: string,
    data: Record<string, unknown>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) => {
    await syncQueueService.enqueue({
      tableName,
      operation,
      recordId,
      data,
      priority
    });
    await refreshStats();
  }, [refreshStats]);

  // Forzar procesamiento manual
  const processNow = useCallback(async () => {
    if (!navigator.onLine) {
      addIncident('SYNC_QUEUE', 'No hay conexión para procesar cola');
      return;
    }

    setIsProcessing(true);
    try {
      await syncQueueService.processQueue();
    } finally {
      setIsProcessing(false);
      await refreshStats();
    }
  }, [addIncident, refreshStats]);

  // Reintentar fallidos
  const retryFailed = useCallback(async () => {
    await syncQueueService.retryFailed();
    await refreshStats();
  }, [refreshStats]);

  // Limpiar antiguos
  const cleanup = useCallback(async () => {
    await syncQueueService.cleanup();
    await refreshStats();
  }, [refreshStats]);

  // Inicializar auto-proceso
  useEffect(() => {
    syncQueueService.initAutoProcess();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Actualizar stats periódicamente
    const interval = setInterval(refreshStats, 10000);

    refreshStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshStats]);

  return {
    stats,
    isOnline,
    isProcessing,
    enqueue,
    processNow,
    retryFailed,
    cleanup,
    refreshStats
  };
}

// Función helper para usar en cualquier lugar de la app
export async function queueOperation(
  tableName: string,
  operation: 'create' | 'update' | 'delete',
  recordId: string,
  data: Record<string, unknown>,
  priority?: 'high' | 'normal' | 'low'
): Promise<void> {
  await syncQueueService.enqueue({ tableName, operation, recordId, data, priority: priority ?? 'normal' });
}
