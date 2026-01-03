
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
        <div className="w-full bg-white border-t-8 border-black p-6 flex flex-col gap-6 max-w-lg mx-auto rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
            {/* STATS DE ALTO CONTRASTE */}
            <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                    <span className="text-xs uppercase font-black text-slate-500 tracking-[0.2em]">Total Unid.</span>
                    <span className="text-5xl font-black tabular-nums text-black">{sessionStats.totalQty}</span>
                </div>
                
                <div className="flex flex-col text-right">
                    <span className="text-xs uppercase font-black text-slate-500 tracking-[0.2em]">Variedad SKUs</span>
                    <span className="text-5xl font-black tabular-nums text-blue-700">{sessionStats.uniqueSkus}</span>
                </div>
            </div>

            {/* BOTONES GIGANTES */}
            <div className="grid grid-cols-3 gap-4 h-32">
                <button 
                    onClick={onCameraClick}
                    className="bg-blue-100 text-blue-900 border-4 border-blue-900 rounded-[2rem] flex flex-col items-center justify-center gap-2 active:translate-y-2 transition-all"
                >
                    <Camera className="w-10 h-10 stroke-[2.5px]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">CÁMARA</span>
                </button>

                <button 
                    onClick={onMultiplierClick}
                    className={`rounded-[2.5rem] flex flex-col items-center justify-center transition-all border-4 shadow-xl active:scale-90 ${
                        multiplier > 1 
                        ? 'bg-black text-white border-black ring-8 ring-blue-100' 
                        : 'bg-white text-black border-black'
                    }`}
                >
                    <span className="text-5xl font-black leading-none">x{multiplier}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest mt-1">CANT.</span>
                </button>
                
                <button 
                    onClick={onManualClick}
                    className="bg-black text-white border-4 border-black rounded-[2rem] flex flex-col items-center justify-center gap-2 active:translate-y-2 transition-all shadow-xl"
                >
                    <Keyboard className="w-10 h-10 stroke-[2.5px]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">TECLADO</span>
                </button>
            </div>
        </div>
    );
});
