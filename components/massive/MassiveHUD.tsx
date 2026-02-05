
import React, { memo } from 'react';
import { Minus, Plus, Target } from 'lucide-react';
import { ConsolidatedBlindItem } from '../../hooks/useMassiveScanner';
import { determineItemStatus, getStatusColorClasses } from '../../services/uiLogic';

interface Props {
    item: ConsolidatedBlindItem | null;
    feedback: string;
    onDecrement: (item: ConsolidatedBlindItem) => void;
    onIncrement: (barcode: string) => void;
}

export const MassiveHUD: React.FC<Props> = memo(({ item, feedback, onDecrement, onIncrement }) => {
    
    // Determinación de color basada en lógica centralizada
    const status = item ? determineItemStatus(item.totalQuantity, item.expectedQty) : 'neutral';
    const bgClass = item ? getStatusColorClasses(status, 'bg') : 'bg-slate-950';

    return (
        <div className={`h-[32dvh] relative flex flex-col overflow-hidden border-b-4 border-black shrink-0 transition-colors duration-300 ${bgClass}`}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent opacity-50"></div>
            
            <div className="w-full h-full flex items-stretch relative z-10">
                {item ? (
                    <>
                        {/* Botón Decrementar */}
                        <button 
                            onPointerDown={(e) => { e.preventDefault(); onDecrement(item); }} 
                            className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5 transition-colors hover:bg-black/20"
                        >
                            <Minus className="w-12 h-12 text-white/40 active:text-white" />
                        </button>

                        {/* Display Central */}
                        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center overflow-hidden">
                            <div className="mb-2 w-full">
                                <span className="text-white/40 font-mono text-[9px] font-black tracking-[0.3em] block mb-1 uppercase truncate">
                                    {item.barcode}
                                </span>
                                <h2 className="text-white font-black text-xs md:text-sm uppercase tracking-tight line-clamp-2 px-4 leading-tight">
                                    {item.name}
                                </h2>
                            </div>
                            
                            <div className="relative">
                                <div className="text-[10rem] md:text-[12rem] font-black tabular-nums leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] transform-gpu">
                                    {item.totalQuantity}
                                </div>
                                {item.expectedQty !== undefined && (
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/20 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                                        Meta: {item.expectedQty}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón Incrementar */}
                        <button 
                            onPointerDown={(e) => { e.preventDefault(); onIncrement(item.barcode); }} 
                            className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5 transition-colors hover:bg-black/20"
                        >
                            <Plus className="w-12 h-12 text-white/40 active:text-white" />
                        </button>
                    </>
                ) : (
                    <div className="w-full flex flex-col items-center justify-center opacity-10">
                        <Target className="w-20 h-20 mb-4 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.8em]">Esperando_Input_Laser</p>
                    </div>
                )}
            </div>

            {/* Capa de Feedback Visual */}
            {feedback === 'success' && <div className="absolute inset-0 z-50 bg-white/20 pointer-events-none animate-flash-quick"></div>}
            
            <style>{`
                @keyframes flash-quick { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-quick { animation: flash-quick 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            `}</style>
        </div>
    );
});
