/**
 * SyncQueueStatus - Componente UI para mostrar estado de cola offline
 */

import { useSyncQueue } from '@/hooks/useSyncQueue';

export function SyncQueueStatus() {
  const { stats, isOnline, isProcessing, processNow, retryFailed } = useSyncQueue();

  if (stats.total === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      {/* Indicador de conexión */}
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      
      {/* Info de cola */}
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {stats.pending} operación{stats.pending !== 1 ? 'es' : ''} pendiente{stats.pending !== 1 ? 's' : ''} de sincronizar
        </p>
        {stats.failed > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {stats.failed} fallid{stats.failed !== 1 ? 'as' : 'a'}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {stats.failed > 0 && (
          <button
            onClick={retryFailed}
            className="px-3 py-1 text-xs font-medium bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 rounded transition-colors"
          >
            Reintentar
          </button>
        )}
        {isOnline && !isProcessing && (
          <button
            onClick={processNow}
            className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Sync ahora
          </button>
        )}
      </div>
    </div>
  );
}
