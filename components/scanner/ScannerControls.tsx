
import React, { memo } from 'react';
import { Camera, Ban, Keyboard, Zap } from 'lucide-react';
import { CountingSession } from '../../types';

interface ScannerControlsProps {
    session: CountingSession;
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
    session,
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
        <div className="w-full glass-card rounded-[3rem] p-4 shadow-2xl flex flex-col gap-4 mb-4 mx-auto max-w-lg">
            {/* HUD de Información Rápida */}
            <div className="flex items-center justify-between px-6 pt-2 border-b border-white/5 pb-4">
                <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em]">Total</span>
                    <span className="text-2xl font-black tabular-nums text-white">{sessionStats.totalQty}</span>
                </div>
                
                {showSpeedometer && (
                    <div className="flex flex-col items-center bg-blue-500/10 px-4 py-1 rounded-full border border-blue-500/20">
                        <div className="flex items-center gap-1.5">
                            <Zap className={`w-3 h-3 ${scansPerMinute > 25 ? 'text-blue-400 fill-blue-400' : 'text-slate-500'}`} />
                            <span className="text-sm font-black text-blue-400">{scansPerMinute} <span className="text-[9px] opacity-60">IPM</span></span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em]">SKUs</span>
                    <span className="text-2xl font-black tabular-nums text-indigo-400">{sessionStats.uniqueSkus}</span>
                </div>
            </div>

            {/* Fila de Botones de Acción Ergonómica */}
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={onCameraClick}
                    className={`h-20 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all btn-press border-2 ${
                        hasCameraSupport 
                        ? 'bg-white/5 text-slate-200 border-white/5' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20 opacity-50'
                    }`}
                >
                    <Camera className="w-7 h-7" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Cámara</span>
                </button>

                <button 
                    onClick={onMultiplierClick}
                    className={`h-20 rounded-[2rem] flex flex-col items-center justify-center transition-all btn-press border-2 ${
                        multiplier > 1 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                        : 'bg-white/5 text-slate-200 border-white/5'
                    }`}
                >
                    <span className="text-3xl font-black leading-none">x{multiplier}</span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">Multi</span>
                </button>
                
                <button 
                    onClick={onManualClick}
                    className="h-20 rounded-[2rem] bg-slate-100 text-slate-900 flex flex-col items-center justify-center gap-2 btn-press shadow-xl"
                >
                    <Keyboard className="w-7 h-7" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Teclado</span>
                </button>
            </div>
        </div>
    );
});
