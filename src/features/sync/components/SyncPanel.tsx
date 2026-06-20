/**
 * SyncPanel - Panel principal de sincronización
 * 
 * Extraído de SyncCenterPage para reducir complejidad.
 */

import React, { useState } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle2, AlertCircle, 
  Wifi, WifiOff, Clock, Database, Trash2
} from 'lucide-react';
import { useSyncStore } from '@/stores';
import { SyncStatusBadge } from './SyncStatusBadge';

interface SyncPanelProps {
  onFullSync: () => Promise<void>;
  onClearCloudData: () => void;
  isOnline: boolean;
  className?: string;
}

export const SyncPanel: React.FC<SyncPanelProps> = ({
  onFullSync,
  onClearCloudData,
  isOnline,
  className = '',
}) => {
  const { 
    isSyncing, 
    lastSyncTime, 
    pendingItems,
    syncError,
    setSyncError
  } = useSyncStore();

  const [isClearing, setIsClearing] = useState(false);

  // Formatear tiempo relativo
  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Nunca';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} horas`;
    return `Hace ${days} días`;
  };

  const handleClearData = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      await onClearCloudData();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sincronización
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isOnline ? 'Conectado a la nube' : 'Modo offline'}
            </p>
          </div>
        </div>
        <SyncStatusBadge 
          status={isOnline ? (isSyncing ? 'syncing' : 'synced') : 'error'} 
          size="lg"
        />
      </div>

      {/* Estado de conexión */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
          {isOnline ? 'Conexión activa' : 'Sin conexión'}
        </span>
      </div>

      {/* Última sincronización */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Última sincronización:</span>
          <span className="font-medium">
            {isSyncing ? 'En progreso...' : formatRelativeTime(lastSyncTime)}
          </span>
        </div>
      </div>

      {/* Error */}
      {syncError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-400">{syncError}</p>
              <button
                onClick={() => setSyncError(null)}
                className="text-xs text-red-500 hover:text-red-600 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          label="Completado"
          value={isSyncing ? '...' : 'OK'}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          label="Pendientes"
          value={pendingItems}
        />
        <StatCard
          icon={<Database className="w-5 h-5 text-blue-500" />}
          label="Incidentes"
          value={useSyncStore.getState().incidents.length}
        />
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={onFullSync}
          disabled={isSyncing || !isOnline}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            isSyncing || !isOnline
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Sincronizar Todo
            </>
          )}
        </button>
        <button
          onClick={handleClearData}
          disabled={isSyncing || isClearing}
          className="px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
          title="Limpiar datos de la nube"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Componente auxiliar para estadísticas
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
  </div>
);

export default SyncPanel;
