
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
                <h2 className="text-3xl font-black text-slate-500 uppercase tracking-[0.4em]">ELIMINADO</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.category === 'POR_CLASIFICAR' || activeProduct.name.startsWith('PENDIENTE');
        const displayName = activeProduct?.name || 'PRODUCTO_REGISTRADO';
        const targetQty = expectedItem?.expectedQty;
        
        const status = determineItemStatus(accumulatedQty, targetQty);
        const bgClass = getStatusColorClasses(status, 'bg');

        // AJUSTE DINÁMICO DE FUENTE: Evita el recorte de números de 2 o 3 dígitos
        const getFontSizeClass = (val: number) => {
            if (val >= 100) return 'text-[6.5rem] md:text-[9rem]';
            if (val >= 10) return 'text-[9rem] md:text-[12rem]';
            return 'text-[12rem] md:text-[15rem]';
        };

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/20 to-transparent"></div>

                <div className="flex-1 flex items-stretch relative z-10">
                    {/* ZONA DECREMENTAR */}
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDecrement?.(); }}
                        className="w-20 md:w-32 bg-black/5 active:bg-black/20 flex items-center justify-center border-r border-white/5 transition-all"
                    >
                        <Minus className="w-12 h-12 text-white/30" />
                    </button>

                    {/* VISOR PRINCIPAL */}
                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                        <div className="mb-1 w-full max-w-[90%]">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-white/50 font-mono text-[9px] font-black tracking-widest uppercase truncate max-w-[120px]">
                                    {lastScan.barcode}
                                </span>
                                {lastScan.mm && (
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/70 text-[8px] font-black uppercase">
                                        EXP: {lastScan.mm}/{lastScan.yyyy}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-white font-black text-[11px] md:text-sm uppercase tracking-tight line-clamp-1 leading-none italic">
                                {displayName}
                            </h1>
                        </div>

                        <div className="relative flex items-center justify-center w-full min-h-[14rem]">
                            <div className={`${getFontSizeClass(accumulatedQty)} leading-none font-black tabular-nums tracking-tighter drop-shadow-2xl transition-all duration-150`}>
                                {accumulatedQty}
                            </div>
                            
                            {targetQty !== undefined && targetQty > 0 && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                                    OBJETIVO: {targetQty}
                                    {accumulatedQty >= targetQty && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ZONA INCREMENTAR */}
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onIncrement?.(); }}
                        className="w-20 md:w-32 bg-black/5 active:bg-black/20 flex items-center justify-center border-l border-white/5 transition-all"
                    >
                        <Plus className="w-12 h-12 text-white/30" />
                    </button>
                </div>

                {isUnknown && (
                    <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-orange-500 w-full max-w-xs">
                            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-slate-900 font-black uppercase text-[10px] mb-6 tracking-widest">SKU no registrado</h3>
                            <button onClick={onRegisterPending} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]">Identificar ahora</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950">
            <div className="relative">
                <AlertCircle className="w-16 h-16 text-white/5 animate-pulse" />
                <div className="absolute inset-0 border-4 border-white/5 rounded-full animate-ping opacity-10"></div>
            </div>
            <h2 className="mt-6 text-[10px] font-black uppercase tracking-[0.6em] text-white/20 italic">ESPERANDO_LECTURA</h2>
        </div>
    );
});
