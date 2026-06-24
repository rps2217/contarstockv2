/**
 * ScannerHeaderIndustrial - Header profesional estilo industrial
 * 
 * Diseño inspirado en software de warehousing profesional
 */

import React, { memo } from 'react';
import { 
  Package, 
  MapPin, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Settings,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Battery,
  Signal,
  Clock
} from 'lucide-react';

interface ScannerHeaderIndustrialProps {
  // Info principal
  title: string;
  subtitle?: string;
  location: string;
  
  // Estados de conexión
  isOnline?: boolean;
  isSyncing?: boolean;
  autoSyncEnabled?: boolean;
  
  // Acciones
  onLocationClick: () => void;
  onLock?: () => void;
  onSettings?: () => void;
  onSync?: () => void;
  onUndo?: () => void;
  
  // Estados
  canUndo?: boolean;
  isLocked?: boolean;
  
  // Stats opcionales
  stats?: {
    items?: number;
    quantity?: number;
    time?: string;
  };
}

export const ScannerHeaderIndustrial: React.FC<ScannerHeaderIndustrialProps> = memo(({
  title,
  subtitle,
  location,
  isOnline = true,
  isSyncing = false,
  autoSyncEnabled = false,
  onLocationClick,
  onLock,
  onSettings,
  onSync,
  onUndo,
  canUndo = false,
  isLocked = false,
  stats
}) => {
  return (
    <header className="h-16 px-4 flex items-center justify-between shrink-0 bg-slate-900 border-b border-slate-800">
      
      {/* LEFT: Logo + Info */}
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        
        {/* Divider */}
        <div className="w-px h-8 bg-slate-700" />
        
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">{title}</h1>
            {subtitle && (
              <p className="text-[10px] text-slate-500 font-mono">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: Location Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onLocationClick}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all group"
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white font-mono tracking-wider">
            {location}
          </span>
          <span className="text-[10px] text-slate-500 uppercase">Cambiar</span>
        </button>
      </div>

      {/* RIGHT: Stats + Actions */}
      <div className="flex items-center gap-4">
        
        {/* Sync Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
          {isSyncing ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Sync</span>
            </>
          ) : autoSyncEnabled ? (
            <>
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cloud</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local</span>
            </>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-white">{stats.items || 0}</span>
              <span className="text-[10px] text-slate-500">items</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400">{stats.quantity || 0}</span>
              <span className="text-[10px] text-slate-500">uds</span>
            </div>
            {stats.time && (
              <>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300 font-mono">{stats.time}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-slate-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
              title="Sincronizar"
            >
              <Cloud className="w-4 h-4 text-slate-400" />
            </button>
          )}
          
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                canUndo
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
              }`}
              title="Deshacer último"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onLock && (
            <button
              onClick={onLock}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                isLocked
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-400'
              }`}
              title={isLocked ? 'Desbloquear' : 'Bloquear'}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          {onSettings && (
            <button
              onClick={onSettings}
              className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"
              title="Ajustes"
            >
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

ScannerHeaderIndustrial.displayName = 'ScannerHeaderIndustrial';
