/**
 * useOfflineSync - Hook de React para la cola de sincronización offline
 *
 * Proporciona:
 * - Estado de la cola en tiempo real
 * - Función para agregar operaciones
 * - Indicadores de sincronización
 * - Reintentos automáticos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOfflineSyncQueue,
  OfflineSyncQueue,
  type QueuedOperation,
  type SyncOperationType,
  type SyncPriority,
} from '@/services/OfflineSyncQueue';

export interface UseOfflineSyncReturn {
  // Estado
  queueSize: number;
  pendingOperations: QueuedOperation[];
  isOnline: boolean;
  isSyncing: boolean;

  // Operaciones
  enqueue: <T>(type: SyncOperationType, data: T, priority?: SyncPriority) => string;
  remove: (id: string) => boolean;
  clear: () => void;
  syncNow: () => Promise<void>;

  // Helpers
  hasPending: (type?: SyncOperationType) => boolean;
  getPendingCount: (type?: SyncOperationType) => number;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const queue = useMemo(() => getOfflineSyncQueue(), []);

  const [state, setState] = useState(() => queue.getState());

  // Suscribirse a cambios
  useEffect(() => {
    const unsubscribe = queue.subscribe(setState);
    return unsubscribe;
  }, [queue]);

  // Sincronizar ahora
  const syncNow = useCallback(async () => {
    await queue.triggerSync();
  }, [queue]);

  // Agregar a cola
  const enqueue = useCallback(
    <T,>(type: SyncOperationType, data: T, priority: SyncPriority = 'normal'): string => {
      return queue.enqueue(type, data, priority);
    },
    [queue]
  );

  // Remover
  const remove = useCallback(
    (id: string): boolean => {
      return queue.remove(id);
    },
    [queue]
  );

  // Limpiar
  const clear = useCallback(() => {
    queue.clear();
  }, [queue]);

  // Helpers
  const hasPending = useCallback(
    (type?: SyncOperationType): boolean => {
      if (type) {
        return state.operations.some(op => op.type === type);
      }
      return state.operations.length > 0;
    },
    [state.operations]
  );

  const getPendingCount = useCallback(
    (type?: SyncOperationType): number => {
      if (type) {
        return state.operations.filter(op => op.type === type).length;
      }
      return state.operations.length;
    },
    [state.operations]
  );

  return {
    queueSize: state.operations.length,
    pendingOperations: state.operations,
    isOnline: state.isOnline,
    isSyncing: false, // TODO: Implementar tracking
    enqueue,
    remove,
    clear,
    syncNow,
    hasPending,
    getPendingCount,
  };
}

// =============================================================================
// COMPONENTE INDICADOR
// =============================================================================

import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  queueSize: number;
  isOnline: boolean;
  isSyncing?: boolean;
  onClick?: () => void;
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  queueSize,
  isOnline,
  isSyncing = false,
  onClick,
  className,
}) => {
  const Icon = !isOnline ? CloudOff : isSyncing ? RefreshCw : Cloud;
  const color = !isOnline ? 'text-amber-500' : queueSize > 0 ? 'text-primary' : 'text-emerald-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 text-xs',
        color,
        onClick && 'hover:opacity-80 cursor-pointer',
        className
      )}
    >
      <Icon className={cn('w-4 h-4', isSyncing && 'animate-spin')} />

      {queueSize > 0 && (
        <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {queueSize > 99 ? '99+' : queueSize}
        </span>
      )}

      {!isOnline && <span className="text-amber-500 font-medium">Offline</span>}
    </button>
  );
};

// =============================================================================
// BANNER DE RECUPERACIÓN OFFLINE
// =============================================================================

interface OfflineRecoveryBannerProps {
  pendingCount: number;
  onSync: () => void;
  onDismiss: () => void;
}

export const OfflineRecoveryBanner: React.FC<OfflineRecoveryBannerProps> = ({
  pendingCount,
  onSync,
  onDismiss,
}) => {
  if (pendingCount === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-primary">📡 Operaciones pendientes de sincronizar</p>
        <p className="text-xs text-secondary mt-1">
          {pendingCount} operación{pendingCount > 1 ? 'es' : ''} guardada
          {pendingCount > 1 ? 's' : ''} localmente. Se sincronizarán cuando haya conexión.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs font-medium text-muted hover:text-primary transition-colors"
        >
          Ignorar
        </button>
        <button
          onClick={onSync}
          className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Sincronizar
        </button>
      </div>
    </div>
  );
};
