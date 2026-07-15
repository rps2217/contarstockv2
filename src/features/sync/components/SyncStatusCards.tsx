/**
 * SyncStatusCards - Tarjetas de estado de sincronización
 */

import React, { memo, useMemo } from 'react';
import { Wifi, WifiOff, Clock, Database } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  isOnline: boolean;
  isSupabaseConnected: boolean;
  totalPending: number;
  lastSyncTime: number | null;
}

const SyncStatusCardsComponent: React.FC<Props> = ({
  isOnline,
  isSupabaseConnected,
  totalPending,
  lastSyncTime,
}) => {
  const lastSyncFormatted = useMemo(() => {
    return lastSyncTime ? format(new Date(lastSyncTime), 'HH:mm:ss dd/MM', { locale: es }) : 'Nunca';
  }, [lastSyncTime]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Connection status */}
      <div className="bg-surface/40 border border-subtle/80 p-4.5 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Estado del Dispositivo</span>
          <span className="text-sm font-black uppercase mt-1 block flex items-center gap-1.5">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" /> Con Conexión
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-500" /> Modo Offline
              </>
            )}
          </span>
        </div>
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'} shadow-lg`} />
      </div>

      {/* Sync Queue Badge */}
      <div className="bg-surface/40 border border-subtle/80 p-4.5 rounded-2xl">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Pendientes en Cola</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-white">{totalPending}</span>
          <span className="text-[10px] text-muted font-mono">Modificados</span>
        </div>
      </div>

      {/* Database Health */}
      <div className="bg-surface/40 border border-subtle/80 p-4.5 rounded-2xl">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Canal Cloud</span>
        <span className="text-sm font-black uppercase mt-1 block flex items-center gap-1.5">
          {isSupabaseConnected ? (
            <span className="text-emerald-400">Canal Abierto</span>
          ) : (
            <span className="text-amber-500">Conexión Inestable</span>
          )}
        </span>
      </div>

      {/* Last Sync */}
      <div className="bg-surface/40 border border-subtle/80 p-4.5 rounded-2xl">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Última Reconciliación</span>
        <span className="text-xs font-bold text-muted font-mono mt-1.5 block">
          {lastSyncFormatted}
        </span>
      </div>
    </div>
  );
};

export const SyncStatusCards = memo(SyncStatusCardsComponent);
