
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, CheckCircle, Minus, Plus, Calendar } from 'lucide-react';
import { ScanRecord, Product, ExpectedItem } from '../../types';
import { ScannerFeedback } from '../../hooks/useScanner';
import { determineItemStatus, getStatusColorClasses } from '../../services/uiLogic';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProduct: Product | undefined;
    accumulatedQty: number;
    feedback: ScannerFeedback;
    onRegisterPending: () => void;
    expectedItem?: ExpectedItem | null;
    onDecrement?: () => void;
    onIncrement?: () => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProduct, 
    accumulatedQty,
    feedback, 
    onRegisterPending,
    expectedItem,
    onDecrement,
    onIncrement
}) => {
    if (feedback === 'undo') {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 animate-in zoom-in duration-300">
                <div className="p-12 bg-slate-800 rounded-full mb-8 border-4 border-white/5 shadow-inner">
                    <RotateCcw className="w-20 h-20 text-slate-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-500 uppercase tracking-[0.4em]">DESHECHO</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.category === 'POR_CLASIFICAR' || activeProduct.name.startsWith('PENDIENTE');
        const displayName = activeProduct?.name || 'SKU_DESCONOCIDO';
        const targetQty = expectedItem?.expectedQty;
        
        const status = determineItemStatus(accumulatedQty, targetQty);
        const bgClass = getStatusColorClasses(status, 'bg');

        // Lógica de escalado: a más dígitos, menos tamaño
        const getFontSize = (val: number) => {
            if (val >= 100) return 'text-[7rem] md:text-[10rem]';
            if (val >= 10) return 'text-[9rem] md:text-[12rem]';
            return 'text-[11rem] md:text-[14rem]';
        };

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/10"></div>

                <div className="flex-1 flex items-stretch relative z-10">
                    {/* BOTÓN DECREMENTAR - Área extendida para PDAs */}
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); onDecrement?.(); }}
                        className="w-20 md:w-28 bg-black/5 active:bg-black/20 flex items-center justify-center border-r border-white/5 transition-all"
                    >
                        <Minus className="w-10 h-10 text-white/30 active:text-white" />
                    </button>

                    {/* DISPLAY CENTRAL AUTO-AJUSTABLE */}
                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                        <div className="mb-2 w-full max-w-[90%]">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-white/50 font-mono text-[9px] font-black tracking-widest uppercase truncate">
                                    {lastScan.barcode}
                                </span>
                                {lastScan.mm && (
                                    <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded border border-white/10 text-blue-200 text-[8px] font-black uppercase">
                                        <Calendar className="w-2.5 h-2.5" /> {lastScan.mm}/{lastScan.yyyy}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-white font-black text-xs md:text-lg uppercase tracking-tight line-clamp-1 leading-none">
                                {displayName}
                            </h1>
                        </div>

                        <div className="relative flex items-center justify-center w-full">
                            <div className={`${getFontSize(accumulatedQty)} leading-none font-black tabular-nums tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-200`}>
                                {accumulatedQty}
                            </div>
                            
                            {targetQty !== undefined && targetQty > 0 && (
                                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/20 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
                                    META: {targetQty}
                                    {accumulatedQty >= targetQty && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTÓN INCREMENTAR - Área extendida */}
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); onIncrement?.(); }}
                        className="w-20 md:w-28 bg-black/5 active:bg-black/20 flex items-center justify-center border-l border-white/5 transition-all"
                    >
                        <Plus className="w-10 h-10 text-white/30 active:text-white" />
                    </button>
                </div>

                {isUnknown && (
                    <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-orange-500 w-full max-w-xs">
                            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-slate-900 font-black uppercase text-[10px] mb-6 tracking-widest leading-relaxed">SKU No registrado</h3>
                            <button onClick={onRegisterPending} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]">Identificar Producto</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950/50">
            <div className="relative">
                <AlertCircle className="w-16 h-16 text-white/10 animate-pulse" />
                <div className="absolute inset-0 border-4 border-white/5 rounded-full animate-ping opacity-20"></div>
            </div>
            <h2 className="mt-6 text-sm font-black uppercase tracking-[0.5em] text-white/20 italic">ESPERANDO_LÁSER</h2>
        </div>
    );
});
