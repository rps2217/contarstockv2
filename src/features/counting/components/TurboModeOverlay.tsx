/**
 * TurboModeOverlay - Visualización del modo turbo
 * 
 * Muestra:
 * - Cantidad grande centrada en pantalla
 * - Contador de items escaneados
 * - Minimalista para no distraer
 */

import React from 'react';
import { Zap } from 'lucide-react';

interface TurboModeOverlayProps {
  isActive: boolean;
  lastQuantity: number;
  scanCount: number;
  productName?: string;
}

export const TurboModeOverlay: React.FC<TurboModeOverlayProps> = ({
  isActive,
  lastQuantity,
  scanCount,
  productName,
}) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[180] bg-black/95 flex flex-col items-center justify-center pointer-events-none">
      {/* Header minimalista */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="bg-amber-500 p-2 rounded-xl">
          <Zap className="w-5 h-5 text-black" />
        </div>
        <span className="text-amber-400 font-black uppercase tracking-widest text-xs">
          TURBO
        </span>
        <span className="text-slate-500 text-xs">
          {scanCount} items
        </span>
      </div>

      {/* Cantidad grande */}
      <div className="flex flex-col items-center">
        <div className="text-9xl font-black text-white leading-none">
          +{lastQuantity}
        </div>
        {productName && (
          <div className="text-slate-500 text-sm font-medium mt-4 max-w-xs text-center truncate">
            {productName}
          </div>
        )}
      </div>

      {/* Hint para salir */}
      <div className="absolute bottom-8 text-slate-600 text-xs font-medium">
        Presiona Alt+T para salir del modo turbo
      </div>
    </div>
  );
};
