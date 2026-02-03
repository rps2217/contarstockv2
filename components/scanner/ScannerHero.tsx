
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

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-200 bg-gradient-to-b from-black/20 to-transparent"></div>

                <div className="flex-1 flex items-stretch relative z-10">
                    {/* BOTÓN DECREMENTAR */}
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); onDecrement?.(); }}
                        className="w-24 md:w-32 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5 transition-all"
                    >
                        <Minus className="w-12 h-12 text-white/40 active:text-white" />
                    </button>

                    {/* DISPLAY CENTRAL */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                        <div className="mb-4 w-full">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-white/40 font-mono text-[10px] font-black tracking-[0.3em] uppercase truncate max-w-[200px]">
                                    {lastScan.barcode}
                                </span>
                                {lastScan.mm && (
                                    <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/10 text-blue-300 text-[8px] font-black uppercase">
                                        <Calendar className="w-2.5 h-2.5" /> {lastScan.mm}/{lastScan.yyyy}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-white font-black text-sm md:text-xl uppercase tracking-tight line-clamp-2 leading-tight px-2">
                                {displayName}
                            </h1>
                        </div>

                        <div className="relative">
                            <div className="text-[10rem] md:text-[14rem] leading-none font-black tabular-nums tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                {accumulatedQty}
                            </div>
                            
                            {targetQty !== undefined && targetQty > 0 && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/20 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-2">
                                    Meta: {targetQty}
                                    {accumulatedQty >= targetQty && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTÓN INCREMENTAR */}
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); onIncrement?.(); }}
                        className="w-24 md:w-32 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5 transition-all"
                    >
                        <Plus className="w-12 h-12 text-white/40 active:text-white" />
                    </button>
                </div>

                {isUnknown && (
                    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-orange-500 w-full max-w-xs">
                            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-slate-900 font-black uppercase text-xs mb-6 tracking-widest leading-relaxed">SKU No registrado en el catálogo local</h3>
                            <button onClick={onRegisterPending} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]">Identificar Producto</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950/50 opacity-20">
            <AlertCircle className="w-24 h-24 mb-6 text-white animate-pulse" />
            <h2 className="text-2xl font-black uppercase tracking-[0.6em] text-white italic">LÁSER_STANDBY</h2>
        </div>
    );
});
