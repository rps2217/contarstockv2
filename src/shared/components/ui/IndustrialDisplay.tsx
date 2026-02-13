
import React, { memo } from 'react';
import { Minus, Plus, Target, CheckCircle } from 'lucide-react';
import { determineItemStatus, getStatusColorClasses } from '../../../services/uiLogic';

interface IndustrialDisplayProps {
    barcode: string | null;
    name: string | null;
    quantity: number;
    targetQuantity?: number;
    feedback?: string;
    onIncrement: () => void;
    onDecrement: () => void;
}

/**
 * HUD INDUSTRIAL UNIFICADO v6.0 (DRY)
 * Centraliza la visualización de conteo para evitar regresiones visuales.
 */
export const IndustrialDisplay: React.FC<IndustrialDisplayProps> = memo(({
    barcode, name, quantity, targetQuantity, feedback, onIncrement, onDecrement
}) => {
    if (!barcode) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-20">
                <Target className="w-20 h-20 mb-4 animate-pulse text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.8em]">SCANNER_STANDBY</p>
            </div>
        );
    }

    const status = determineItemStatus(quantity, targetQuantity);
    const bgClass = getStatusColorClasses(status, 'bg');

    return (
        <div className={`w-full h-full flex flex-col relative transition-colors duration-300 transform-gpu ${bgClass}`}>
            {feedback === 'success' && <div className="absolute inset-0 z-50 bg-white/10 pointer-events-none animate-flash-fast"></div>}
            
            <div className="flex-1 flex items-stretch relative z-10">
                <button 
                    onPointerDown={(e) => { e.preventDefault(); onDecrement(); }}
                    className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5"
                >
                    <Minus className="w-12 h-12 text-white/40" />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                    <div className="mb-2 w-full">
                        <span className="text-white/40 font-mono text-[10px] font-black tracking-widest block mb-1 uppercase truncate">
                            {barcode}
                        </span>
                        <h2 className="text-white font-black text-sm uppercase tracking-tight line-clamp-1 italic px-4">
                            {name || 'IDENTIFICANDO...'}
                        </h2>
                    </div>

                    <div className="text-[11rem] md:text-[14rem] font-black tabular-nums tracking-tighter drop-shadow-2xl leading-none">
                        {Math.max(0, quantity)}
                    </div>
                    
                    {targetQuantity !== undefined && targetQuantity > 0 && (
                        <div className="bg-black/40 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 shadow-xl">
                            {quantity >= targetQuantity ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Target className="w-4 h-4 text-blue-400" />}
                            META: {targetQuantity}
                        </div>
                    )}
                </div>

                <button 
                    onPointerDown={(e) => { e.preventDefault(); onIncrement(); }}
                    className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5"
                >
                    <Plus className="w-12 h-12 text-white/40" />
                </button>
            </div>

            <style>{`
                @keyframes flash-fast { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-fast { animation: flash-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
});
