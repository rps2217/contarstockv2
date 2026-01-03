
import React, { memo } from 'react';
import { Camera, Keyboard, Zap, List } from 'lucide-react';
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
        <div className="w-full bg-white rounded-t-[3.5rem] p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex flex-col gap-6 mx-auto max-w-xl border-t-4 border-slate-100">
            {/* HUD de Información - Alta Visibilidad */}
            <div className="flex items-center justify-between px-4">
                <div className="flex flex-col">
                    <span className="text-xs uppercase font-black text-slate-500 tracking-widest">Total Unid.</span>
                    <span className="text-4xl font-black tabular-nums text-slate-900">{sessionStats.totalQty}</span>
                </div>
                
                <div className="flex flex-col text-right">
                    <span className="text-xs uppercase font-black text-slate-500 tracking-widest">Variedad SKUs</span>
                    <span className="text-4xl font-black tabular-nums text-indigo-700">{sessionStats.uniqueSkus}</span>
                </div>
            </div>

            {/* Fila de Botones - Objetivos táctiles grandes */}
            <div className="grid grid-cols-3 gap-4">
                <button 
                    onClick={onCameraClick}
                    className={`h-24 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-4 ${
                        hasCameraSupport 
                        ? 'bg-blue-50 text-blue-800 border-blue-200' 
                        : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50'
                    }`}
                >
                    <Camera className="w-8 h-8 stroke-[2.5px]" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Cámara</span>
                </button>

                <button 
                    onClick={onMultiplierClick}
                    className={`h-24 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 border-4 ${
                        multiplier > 1 
                        ? 'bg-blue-700 text-white border-blue-800 shadow-lg' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                >
                    <span className="text-4xl font-black leading-none">x{multiplier}</span>
                    <span className="text-[11px] font-black uppercase tracking-widest mt-1">Cantidad</span>
                </button>
                
                <button 
                    onClick={onManualClick}
                    className="h-24 rounded-3xl bg-slate-900 text-white flex flex-col items-center justify-center gap-2 active:scale-95 shadow-xl border-4 border-slate-800"
                >
                    <Keyboard className="w-8 h-8 stroke-[2.5px]" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Teclado</span>
                </button>
            </div>
        </div>
    );
});
