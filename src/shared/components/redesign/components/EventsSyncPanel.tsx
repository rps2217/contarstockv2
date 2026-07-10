/**
 * EventsSyncPanel - Panel de sincronización para eventos
 * 
 * Muestra estado, métricas y controles de sincronización de eventos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Cloud,
  CloudOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Zap,
  ZapOff,
  History,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useEventsSync } from '@/shared/hooks';
import { eventsSyncService, type EventsRealtimeEvent } from '@/services/cloud/EventsSyncService';

// ============================================================================
// TIPOS
// ============================================================================

interface SyncHistoryEntry {
  id: string;
  timestamp: number;
  type: 'sync' | 'realtime';
  action: 'push' | 'pull' | 'update' | 'delete';
  count: number;
  success: boolean;
  message: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

const formatFullDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================================
// COMPONENTES
// ============================================================================

const StatusIndicator = ({ 
  isOnline, 
  isRealtime, 
  isSyncing 
}: { 
  isOnline: boolean; 
  isRealtime: boolean; 
  isSyncing: boolean;
}) => {
  const getStatus = () => {
    if (isSyncing) return { icon: Loader2, color: 'text-blue-500', animate: true, label: 'Sincronizando' };
    if (!isOnline) return { icon: CloudOff, color: 'text-muted', animate: false, label: 'Sin conexión' };
    if (isRealtime) return { icon: Zap, color: 'text-emerald-500', animate: false, label: 'Tiempo real' };
    return { icon: Cloud, color: 'text-blue-400', animate: false, label: 'Listo' };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={cn("flex items-center gap-2", status.color)}>
      <Icon className={cn("w-4 h-4", status.animate && "animate-spin")} />
      <span className="text-sm font-medium">{status.label}</span>
    </div>
  );
};

const MetricCard = ({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string;
}) => (
  <div className={cn(
    "flex flex-col items-center p-3 rounded-xl border",
    color
  )}>
    <span className="text-2xl font-bold">{value}</span>
    <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
  </div>
);

const HistoryItem = ({ entry }: { entry: SyncHistoryEntry }) => {
  const getActionIcon = () => {
    switch (entry.action) {
      case 'push': return <TrendingUp className="w-3 h-3" />;
      case 'pull': return <TrendingUp className="w-3 h-3 rotate-180" />;
      case 'update': return <RefreshCw className="w-3 h-3" />;
      case 'delete': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg",
      entry.success ? "bg-emerald-500/5" : "bg-rose-500/5"
    )}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center",
        entry.success ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
      )}>
        {entry.success ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getActionIcon()}
          <span className="text-sm font-medium text-primary truncate">{entry.message}</span>
        </div>
        <span className="text-xs text-muted">{formatTime(entry.timestamp)}</span>
      </div>
      <span className="text-xs font-mono text-muted">+{entry.count}</span>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface EventsSyncPanelProps {
  /** Mostrar panel expandido por defecto */
  defaultExpanded?: boolean;
  /** Modo compacto */
  compact?: boolean;
  /** Callback cuando cambia el historial */
  onHistoryChange?: (history: SyncHistoryEntry[]) => void;
}

export const EventsSyncPanel: React.FC<EventsSyncPanelProps> = ({
  defaultExpanded = false,
  compact = false,
  onHistoryChange,
}) => {
  // Estado
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Hook de sincronización
  const {
    syncEvents,
    stats,
    isSyncing,
    lastResult,
  } = useEventsSync({
    showToasts: false, // No mostrar toasts, usar panel
    onSuccess: (result) => {
      setLastSyncTime(Date.now());
      addToHistory({
        type: 'sync',
        action: 'push',
        count: result.created + result.updated,
        success: true,
        message: `Sync completado: ${result.created} creados, ${result.updated} actualizados`,
      });
    },
    onError: (error) => {
      addToHistory({
        type: 'sync',
        action: 'push',
        count: 0,
        success: false,
        message: `Error: ${error}`,
      });
    },
  });

  // Subscribe a eventos realtime
  useEffect(() => {
    if (!isRealtimeEnabled) return;

    const unsubscribe = eventsSyncService.subscribeToRealtimeEvents((event: EventsRealtimeEvent) => {
      addToHistory({
        type: 'realtime',
        action: event.type === 'INSERT' ? 'push' : event.type === 'UPDATE' ? 'update' : 'delete',
        count: 1,
        success: true,
        message: `Realtime: ${event.type.toLowerCase()} evento`,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [isRealtimeEnabled]);

  // Toggle realtime
  const toggleRealtime = useCallback(() => {
    if (isRealtimeEnabled) {
      eventsSyncService.stopRealtimeSync();
      setIsRealtimeEnabled(false);
    } else {
      eventsSyncService.startRealtimeSync();
      setIsRealtimeEnabled(true);
    }
  }, [isRealtimeEnabled]);

  // Agregar al historial
  const addToHistory = useCallback((entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: SyncHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setSyncHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, 50); // Max 50 entries
      onHistoryChange?.(updated);
      return updated;
    });
  }, [onHistoryChange]);

  // Obtener último sync del localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastSync_EVENTOS');
    if (stored) {
      setLastSyncTime(parseInt(stored, 10));
    }
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {/* Status */}
        <StatusIndicator 
          isOnline={navigator.onLine} 
          isRealtime={isRealtimeEnabled} 
          isSyncing={isSyncing} 
        />

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-2 text-xs">
            {stats.pending > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded-full">
                {stats.pending} pendientes
              </span>
            )}
            {stats.error > 0 && (
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-500 rounded-full">
                {stats.error} errores
              </span>
            )}
          </div>
        )}

        {/* Botón sync */}
        <button
          onClick={() => syncEvents()}
          disabled={isSyncing || !navigator.onLine}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isSyncing
              ? "bg-blue-500/20 text-blue-500"
              : "bg-surface hover:bg-elevated text-primary"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-subtle overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-elevated/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isRealtimeEnabled ? "bg-emerald-500/20" : "bg-blue-500/20"
          )}>
            <Cloud className={cn("w-5 h-5", isRealtimeEnabled ? "text-emerald-500" : "text-blue-500")} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Sincronización de Eventos</h3>
            <StatusIndicator 
              isOnline={navigator.onLine} 
              isRealtime={isRealtimeEnabled} 
              isSyncing={isSyncing} 
            />
          </div>
        </div>

        <RefreshCw className={cn(
          "w-5 h-5 text-muted transition-transform",
          isExpanded && "rotate-180"
        )} />
      </div>

      {/* Contenido expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Métricas */}
              {stats && (
                <div className="grid grid-cols-4 gap-2">
                  <MetricCard label="Total" value={stats.total} color="bg-surface border border-subtle" />
                  <MetricCard label="Sincronizados" value={stats.synced} color="bg-emerald-500/10 border border-emerald-500/30" />
                  <MetricCard label="Pendientes" value={stats.pending} color="bg-amber-500/10 border border-amber-500/30" />
                  <MetricCard label="Errores" value={stats.error} color="bg-rose-500/10 border border-rose-500/30" />
                </div>
              )}

              {/* Última sincronización */}
              {lastSyncTime && (
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>Última sync: {formatFullDate(lastSyncTime)}</span>
                </div>
              )}

              {/* Controles */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => syncEvents()}
                  disabled={isSyncing || !navigator.onLine}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                    isSyncing
                      ? "bg-blue-500/50 text-white/70 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  )}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Sincronizar Ahora
                    </>
                  )}
                </button>

                <button
                  onClick={toggleRealtime}
                  disabled={!navigator.onLine}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all border",
                    isRealtimeEnabled
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500"
                      : "bg-surface border-subtle text-secondary hover:text-primary"
                  )}
                  title={isRealtimeEnabled ? "Desactivar tiempo real" : "Activar tiempo real"}
                >
                  {isRealtimeEnabled ? (
                    <>
                      <Zap className="w-4 h-4" />
                      Realtime
                    </>
                  ) : (
                    <>
                      <ZapOff className="w-4 h-4" />
                      Activar
                    </>
                  )}
                </button>
              </div>

              {/* Historial */}
              {syncHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted uppercase tracking-wide">
                    <History className="w-3 h-3" />
                    Historial reciente
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {syncHistory.slice(0, 10).map((entry) => (
                      <HistoryItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsSyncPanel;
