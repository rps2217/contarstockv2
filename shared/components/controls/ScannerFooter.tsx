
import React from 'react';
import { Camera, Keyboard, Package, Zap, MoreHorizontal } from 'lucide-react';

interface ScannerFooterProps {
    multiplier: number;
    unitsPerBox?: number;
    isTriggerActive?: boolean;
    onMultiplierChange: (val: number) => void;
    onOpenManual: () => void;
    onTriggerStart: () => void;
    onTriggerEnd: () => void;
}

/**
 * SCANNER DOCK v5.0
 * Optimizado para PDAs con arco de pulgar ergonómico.
 */
export const ScannerFooter: React.FC<ScannerFooterProps> = ({ 
    multiplier, unitsPerBox, isTriggerActive, onMultiplierChange, onOpenManual, onTriggerStart, onTriggerEnd 
}) => {
    return (
        <div className="h-28 shrink-0 bg-slate-950 border-t-2 border-white/5 flex items-center px-4 gap-3 pb-safe-area shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-50 relative">
            
            {/* SELECTOR DE MODO / MULTIPLICADOR */}
            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => onMultiplierChange(multiplier === 1 ? 10 : 1)}
                    className={`h-12 w-14 rounded-2xl font-black text-lg border-2 transition-all active:scale-90 ${multiplier > 1 ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-900/40' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                    x{multiplier}
                </button>
                <button 
                    onClick={onOpenManual}
                    className="h-12 w-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center active:bg-slate-700 transition-colors border border-white/5"
                >
                    <Keyboard className="w-5 h-5" />
                </button>
            </div>

            {/* GATILLO ÓPTICO CENTRAL (PDA Lens Trigger) */}
            <button 
                onPointerDown={(e) => { e.preventDefault(); onTriggerStart(); }}
                onPointerUp={(e) => { e.preventDefault(); onTriggerEnd(); }}
                onPointerLeave={(e) => { e.preventDefault(); onTriggerEnd(); }}
                onContextMenu={(e) => e.preventDefault()}
                className={`flex-1 h-20 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 transition-all duration-75 select-none touch-none border-b-8 active:border-b-0 active:translate-y-2 ${
                    isTriggerActive 
                    ? 'bg-blue-600 text-white border-blue-800 shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-[0.98]' 
                    : 'bg-white text-black border-slate-300 shadow-2xl'
                }`}
            >
                {isTriggerActive ? (
                    <Zap className="w-8 h-8 fill-current animate-pulse" />
                ) : (
                    <Camera className="w-8 h-8" />
                )}
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                    {isTriggerActive ? 'LENS_READY' : 'SCAN_CAM'}
                </span>
            </button>

            {/* ACCIONES ADICIONALES / CAJA */}
            <div className="flex flex-col gap-2">
                {unitsPerBox && unitsPerBox > 1 ? (
                    <button 
                        onClick={() => onMultiplierChange(unitsPerBox)}
                        className={`h-12 w-14 rounded-2xl font-black text-[9px] border-2 transition-all active:scale-90 flex flex-col items-center justify-center ${multiplier === unitsPerBox ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-indigo-950/40 border-indigo-500/20 text-indigo-400'}`}
                    >
                        <Package className="w-4 h-4 mb-0.5" />
                        BOX {unitsPerBox}
                    </button>
                ) : (
                    <div className="h-12 w-14 bg-slate-900/50 rounded-2xl flex items-center justify-center opacity-20 border border-white/5">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                )}
                
                <button 
                    className="h-12 w-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-slate-500 active:bg-slate-800"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
