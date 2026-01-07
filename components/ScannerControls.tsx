
import React, { memo } from 'react';
import { Camera, Keyboard, Zap, Hash } from 'lucide-react';
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
    onCameraClick, 
    onMultiplierClick, 
    onManualClick 
}) => {
    return (
        <div className="w-full bg-white border-t-8 border-black px-6 pt-6 pb-8 flex flex-col gap-8 max-w-xl mx-auto rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)]">
            {/* STATS DE ALTO CONTRASTE CON MEJOR PADDING */}
            <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Total Unidades</span>
                    <span className="text-5xl md:text-6xl font-black tabular-nums text-black leading-none">{sessionStats.totalQty}</span>
                </div>
                
                <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Variedad SKUs</span>
                    <span className="text-5xl md:text-6xl font-black tabular-nums text-blue-700 leading-none">{sessionStats.uniqueSkus}</span>
                </div>
            </div>

            {/* BOTONES GIGANTES REFORMATEADOS */}
            <div className="grid grid-cols-3 gap-4 h-32">
                <button 
                    onClick={onCameraClick}
                    className="bg-blue-50 text-blue-900 border-4 border-blue-900 rounded-2xl flex flex-col items-center justify-center gap-2 active:translate-y-2 transition-all shadow-md"
                >
                    <Camera className="w-10 h-10 stroke-[2.5px]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">CÁMARA</span>
                </button>

                <button 
                    onClick={onMultiplierClick}
                    className={`rounded-2xl flex flex-col items-center justify-center transition-all border-4 shadow-xl active:scale-90 ${
                        multiplier > 1 
                        ? 'bg-black text-white border-black ring-8 ring-blue-100' 
                        : 'bg-white text-black border-black hover:bg-slate-50'
                    }`}
                >
                    <span className="text-5xl font-black leading-tight">x{multiplier}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest -mt-1">MULTIPLICAR</span>
                </button>
                
                <button 
                    onClick={onManualClick}
                    className="bg-black text-white border-4 border-black rounded-2xl flex flex-col items-center justify-center gap-2 active:translate-y-2 transition-all shadow-xl shadow-black/20"
                >
                    <Keyboard className="w-10 h-10 stroke-[2.5px]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">TECLADO</span>
                </button>
            </div>
        </div>
    );
});
