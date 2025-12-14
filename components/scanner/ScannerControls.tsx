
import React, { memo } from 'react';
import { Gauge, Camera, Ban, Keyboard } from 'lucide-react';

interface ScannerControlsProps {
    sessionStats: { totalQty: number; uniqueSkus: number };
    multiplier: number;
    scansPerMinute: number;
    showSpeedometer: boolean;
    hasCameraSupport: boolean;
    onCameraClick: () => void;
    onMultiplierClick: () => void;
    onManualClick: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = memo(({ 
    sessionStats, 
    multiplier, 
    scansPerMinute, 
    showSpeedometer, 
    hasCameraSupport,
    onCameraClick, 
    onMultiplierClick, 
    onManualClick 
}) => {
    return (
        <div className="shrink-0 pb-safe-area px-4 pb-4 relative z-40">
            <div className="max-w-md mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex justify-between items-center shadow-lg">
                
                {/* Stats */}
                <div className="flex gap-4 px-3 items-center">
                        {/* Mobile Speedometer - Conditional Render */}
                    {showSpeedometer && (
                        <div className="md:hidden flex flex-col items-center justify-center mr-2 w-10">
                            <Gauge className={`w-5 h-5 ${scansPerMinute > 20 ? 'text-green-400' : 'text-slate-500'}`} />
                            <span className={`text-[9px] font-bold ${scansPerMinute > 20 ? 'text-green-400' : 'text-slate-500'}`}>{scansPerMinute}</span>
                        </div>
                    )}

                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-white/40">Unidades</span>
                        <span className="text-xl font-bold tabular-nums">{sessionStats.totalQty}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-white/40">SKUs</span>
                        <span className="text-xl font-bold tabular-nums text-blue-400">{sessionStats.uniqueSkus}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                    <button 
                        onClick={onCameraClick}
                        className={`h-12 w-12 rounded-xl border flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                            hasCameraSupport 
                            ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' 
                            : 'bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900'
                        }`}
                        title={hasCameraSupport ? "Abrir Cámara" : "Cámara bloqueada (Requiere HTTPS)"}
                    >
                        {hasCameraSupport ? <Camera className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
                    </button>

                    <button 
                        onClick={onMultiplierClick}
                        className={`h-12 px-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${multiplier > 1 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <span className="text-xs mr-1 opacity-60">x</span>{multiplier}
                    </button>
                    
                    <button 
                        onClick={onManualClick}
                        className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    >
                        <Keyboard className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
});
