/**
 * useOfflineMode - Hook para gestionar modo offline
 * 
 * Proporciona:
 * - Estado de conexión en tiempo real
 * - Indicadores visuales de sync
 * - Acciones de retry
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useSyncStore } from '@/stores';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface PendingSync {
  table: string;
  count: number;
}

interface OfflineStats {
  pendingCount: number;
  lastSyncTime: number | null;
  isOnline: boolean;
  isSyncing: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export const useOfflineMode = () => {
  const isOnline = useNetworkStatus();
  const { isSyncing, lastSyncTime, pendingItems, syncError, setSyncError } = useSyncStore();
  const [retryCount, setRetryCount] = useState(0);

  // Contar items pendientes por tabla
  const pendingByTable = useLiveQuery(async () => {
    try {
      const [scans, sessions] = await Promise.all([
        db.scans.where('syncStatus').equals('pending').count(),
        db.sessions.where('syncStatus').equals('pending').count(),
      ]);
      
      const pending: PendingSync[] = [];
      if (scans > 0) pending.push({ table: 'scans', count: scans });
      if (sessions > 0) pending.push({ table: 'sessions', count: sessions });
      
      return pending;
    } catch {
      return [];
    }
  }, [], []);

  // Stats memoizado
  const stats: OfflineStats = useMemo(() => ({
    pendingCount: pendingItems,
    lastSyncTime: lastSyncTime ?? null,
    isOnline,
    isSyncing,
    hasError: !!syncError,
    errorMessage: syncError ?? null,
  }), [pendingItems, lastSyncTime, isOnline, isSyncing, syncError]);

  // Retry manual de sync
  const retrySync = useCallback(async () => {
    if (!isOnline) {
      setSyncError?.('Sin conexión a internet');
      return;
    }
    
    setRetryCount(c => c + 1);
    setSyncError?.(null);
  }, [isOnline, setSyncError]);

  // Clear error
  const clearError = useCallback(() => {
    setSyncError?.(null);
  }, [setSyncError]);

  // Determinar estado UI
  const status = useMemo(() => {
    if (!isOnline) return 'offline';
    if (syncError) return 'error';
    if (isSyncing) return 'syncing';
    if (pendingItems > 0) return 'pending';
    return 'synced';
  }, [isOnline, syncError, isSyncing, pendingItems]);

  // Mensaje descriptivo
  const statusMessage = useMemo(() => {
    switch (status) {
      case 'offline':
        return pendingItems > 0 
          ? `${pendingItems} cambios guardados localmente`
          : 'Sin conexión a internet';
      case 'error':
        return syncError || 'Error de sincronización';
      case 'syncing':
        return 'Sincronizando...';
      case 'pending':
        return `${pendingItems} elementos por sincronizar`;
      case 'synced':
        return 'Todo sincronizado';
      default:
        return '';
    }
  }, [status, pendingItems, syncError]);

  return {
    // Estado
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    hasError: !!syncError,
    errorMessage: syncError,
    pendingCount: pendingItems,
    lastSyncTime,
    status,
    statusMessage,
    pendingByTable,
    retryCount,
    stats,
    
    // Acciones
    retrySync,
    clearError,
  };
};
