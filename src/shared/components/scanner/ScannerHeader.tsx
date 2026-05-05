import React from 'react';
import { X, MapPin, Camera, Keyboard, Save, Lock, MoreVertical, Cloud } from 'lucide-react';

interface ScannerHeaderProps {
  onBack: () => void;
  location: string;
  onChangeLocation: () => void;
  isManualMode: boolean;
  onToggleManualMode: () => void;
  onFinalize: () => void;
  onLock?: () => void;
  onOpenTools: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
  onBack,
  location,
  onChangeLocation,
  isManualMode,
  onToggleManualMode,
  onFinalize,
  onLock,
  onOpenTools,
  onSync,
  isSyncing = false
}) => {
  return (
    <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-2 shrink-0 z-50">
      <div className="flex items-center gap-2">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        <button 
          onClick={onChangeLocation}
          className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg active:bg-blue-500/30 active:scale-95 transition-all border border-blue-500/30"
        >
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wider truncate max-w-[80px]">{location}</span>
        </button>
      </div>
      
      <div className="flex items-center gap-1">
        {onSync && (
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isSyncing ? 'text-blue-400 animate-pulse' : 'text-white/70 active:bg-white/10'}`}
            title="Sincronizar con la Nube"
          >
            <Cloud className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isManualMode ? 'bg-white/20 text-white' : 'text-white/70 active:bg-white/10'}`}
          onClick={onToggleManualMode}
          title={isManualMode ? "Modo Cámara" : "Entrada Manual"}
        >
          {isManualMode ? <Camera className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
        </button>
        <button 
          onClick={onFinalize}
          className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-400 active:bg-emerald-500/20 active:scale-95 transition-all"
          title="Guardar y Finalizar"
        >
          <Save className="w-5 h-5" />
        </button>
        {onLock && (
          <button 
            onClick={onLock}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 active:scale-95 transition-all"
            title="Bloquear Pantalla"
          >
            <Lock className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={onOpenTools}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 active:scale-95 transition-all"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

