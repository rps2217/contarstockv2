
import React, { memo, useMemo } from 'react';
import { Gauge, Camera, Ban, Keyboard, Zap } from 'lucide-react';
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
        <div className="w-full bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-4 shadow-2xl shadow-slate-200/50 flex flex-col gap-4">
            <div className="flex items-center justify-between px-4 pt-2 border-b border-slate-100 pb-4">
                <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">Acumulado</span>
                    <span className="text-2xl font-black tabular-nums text-slate-900">{sessionStats.totalQty}</span>
                </div>
                
                {showSpeedometer && (
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">Rendimiento</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Zap className={`w-3 h-3 ${scansPerMinute > 25 ? 'text-blue-500 fill-blue-500' : 'text-slate-300'}`} />
                            <span className="text-sm font-black text-slate-700">{scansPerMinute} <span className="text-[10px] text-slate-400 font-bold uppercase">ipm</span></span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">Variedad SKUs</span>
                    <span className="text-2xl font-black tabular-nums text-blue-600">{sessionStats.uniqueSkus}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={onCameraClick}
                    className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-90 border-2 ${
                        hasCameraSupport 
                        ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-500' 
                        : 'bg-slate-100 text-slate-300 border-transparent opacity-50'
                    }`}
                >
                    <Camera className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Cámara</span>
                </button>

                <button 
                    onClick={onMultiplierClick}
                    className={`h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border-2 ${
                        multiplier > 1 
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                >
                    <span className="text-2xl font-black leading-none">x{multiplier}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest mt-1">Multiplicar</span>
                </button>
                
                <button 
                    onClick={onManualClick}
                    className="h-16 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center gap-1 active:scale-90 transition-all border-2 border-slate-950 shadow-xl"
                >
                    <Keyboard className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Manual</span>
                </button>
            </div>
        </div>
    );
});
