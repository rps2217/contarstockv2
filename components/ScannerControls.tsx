
import React, { memo } from 'react';
import { Camera, Keyboard } from 'lucide-react';
import { CountingSession } from '../types';

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
    sessionStats, 
    multiplier, 
    onCameraClick, 
    onMultiplierClick, 
    onManualClick 
}) => {
    return (
        <div className="w-full bg-white px-6 py-6 flex items-center justify-between gap-4 border border-slate-200/60 rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-50">
            {/* STATS AREA */}
            <div className="flex items-center gap-6 px-4">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades</span>
                    <span className="text-4xl font-black text-slate-900 tabular-nums leading-none">{sessionStats.totalQty}</span>
                </div>
                <div className="w-px h-10 bg-slate-100"></div>
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Skus</span>
                    <span className="text-4xl font-black text-blue-600 tabular-nums leading-none">{sessionStats.uniqueSkus}</span>
                </div>
            </div>

            {/* ACTION BUTTONS GROUP */}
            <div className="flex items-center gap-3">
                <button 
                    onClick={onCameraClick}
                    className="w-16 h-16 bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
                >
                    <Camera className="w-8 h-8 stroke-[2.5px]" />
                </button>

                <button 
                    onClick={onMultiplierClick}
                    className={`h-16 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-sm ${multiplier > 1 ? 'bg-amber-400 border-amber-500 text-amber-950' : 'text-slate-700'}`}
                >
                    <span className="text-sm font-bold opacity-40 uppercase">x</span>
                    <span className="text-3xl font-black tabular-nums">{multiplier}</span>
                </button>
            </div>

            {/* FLOATING KEYPAD TRIGGER ON RIGHT */}
            <button 
                onClick={onManualClick}
                className="w-14 h-16 bg-black text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-xl"
            >
                <Keyboard className="w-7 h-7 stroke-[2.5px]" />
            </button>
        </div>
    );
});
