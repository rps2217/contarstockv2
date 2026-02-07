
import React from 'react';
import { Camera, Keyboard, Package, Trash2 } from 'lucide-react';

interface Props {
    multiplier: number;
    unitsPerBox?: number;
    onMultiplierChange: (val: number) => void;
    onOpenManual: () => void;
    onTriggerCamera: () => void;
}

export const ScannerFooter: React.FC<Props> = ({ 
    multiplier, unitsPerBox, onMultiplierChange, onOpenManual, onTriggerCamera 
}) => {
    return (
        <div className="h-24 shrink-0 bg-slate-950 border-t border-white/10 flex items-center px-4 gap-3 pb-safe-area shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            {/* MULTIPLICADOR ESTÁNDAR */}
            <button 
                onClick={() => onMultiplierChange(multiplier === 1 ? 10 : 1)}
                className={`h-14 w-16 rounded-2xl font-black text-xl border-2 transition-all active:scale-90 ${multiplier > 1 ? 'bg-amber-500 border-amber-400 text-black shadow-lg' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
                x{multiplier}
            </button>

            {/* MULTIPLICADOR POR CAJA (Situación Probable/Útil) */}
            {unitsPerBox && unitsPerBox > 1 && (
                <button 
                    onClick={() => onMultiplierChange(unitsPerBox)}
                    className={`h-14 px-4 rounded-2xl font-black text-[10px] border-2 transition-all active:scale-90 flex flex-col items-center justify-center gap-0.5 ${multiplier === unitsPerBox ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'}`}
                >
                    <Package className="w-4 h-4" />
                    CAJA {unitsPerBox}
                </button>
            )}

            {/* GATILLO ÓPTICO PRINCIPAL */}
            <button 
                onPointerDown={(e) => { e.preventDefault(); onTriggerCamera(); }} 
                className="flex-1 h-14 bg-white text-black rounded-2xl flex items-center justify-center gap-3 active:bg-blue-600 active:text-white transition-all border-b-4 border-slate-300 active:border-b-0 active:translate-y-1"
            >
                <Camera className="w-6 h-6" />
                <span className="text-[11px] font-black uppercase tracking-widest">Gatillo</span>
            </button>

            {/* ENTRADA MANUAL */}
            <button 
                onClick={onOpenManual}
                className="h-14 w-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center active:bg-slate-700 transition-colors border border-white/5"
            >
                <Keyboard className="w-6 h-6" />
            </button>
        </div>
    );
};
