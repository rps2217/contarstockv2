import React from 'react';
import { X, RefreshCw, Zap } from 'lucide-react';

interface ScannerControlsProps {
  autoShootEnabled: boolean;
  onToggleAutoShoot: () => void;
  onStop: () => void;
  onCapture: () => void;
  onRestartStability: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
  autoShootEnabled,
  onToggleAutoShoot,
  onStop,
  onCapture,
  onRestartStability
}) => {
  return (
    <>
      <div className="absolute top-6 right-6 flex flex-col gap-4">
        <button 
          onClick={onToggleAutoShoot}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border-2 transition-all ${autoShootEnabled ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/60'}`}
          title={autoShootEnabled ? "Auto-disparo Activado" : "Auto-disparo Desactivado"}
        >
          <Zap className={`w-6 h-6 ${autoShootEnabled ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 px-6">
        <button 
          onClick={onStop}
          className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white"
        >
          <X className="w-6 h-6" />
        </button>
        
        <button 
          onClick={onCapture}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
        >
          <div className="w-16 h-16 border-4 border-black rounded-full" />
        </button>

        <button 
          onClick={onRestartStability}
          className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          title="Reiniciar Auto-disparo"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>
    </>
  );
};
