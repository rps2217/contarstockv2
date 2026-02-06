
import React, { memo } from 'react';
import { RotateCcw, CheckCircle, Minus, Plus, Sparkles, Target, Search, Package, MapPin } from 'lucide-react';
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
    isDeducing?: boolean;
    aiSuggestion?: string | null;
    onAcceptSuggestion?: (loc: string) => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, activeProduct, accumulatedQty, feedback, onRegisterPending, expectedItem, 
    onDecrement, onIncrement, isDeducing, aiSuggestion, onAcceptSuggestion
}) => {
    
    if (feedback === 'undo') return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 animate-in zoom-in duration-300">
            <RotateCcw className="w-20 h-20 text-slate-500 mb-4" />
            <h2 className="text-2xl font-black text-slate-500 uppercase tracking-widest">Borrado</h2>
        </div>
    );

    if (isDeducing) return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
            <div className="relative mb-6">
                <Search className="w-16 h-16 text-blue-500 animate-pulse" />
                <Sparkles className="w-6 h-6 text-white absolute -top-1 -right-1 animate-bounce" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white animate-pulse">Analizando Carga...</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Motor Detective Activo</p>
        </div>
    );

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name.startsWith('NUEVO_ITEM');
        const status = determineItemStatus(accumulatedQty, expectedItem?.expectedQty);
        const bgClass = getStatusColorClasses(status, 'bg');

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                
                {/* AI SUGGESTION CHIP */}
                {aiSuggestion && onAcceptSuggestion && (
                    <button 
                        onClick={() => onAcceptSuggestion(aiSuggestion)}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border-2 border-indigo-500 animate-in bounce-in duration-500 active:scale-95"
                    >
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[9px] font-black uppercase tracking-tight">Sugerencia IA: <span className="text-indigo-600">{aiSuggestion}</span></span>
                        <div className="bg-indigo-600 text-white p-1 rounded-full"><Plus className="w-2.5 h-2.5" /></div>
                    </button>
                )}

                <div className="flex-1 flex items-stretch relative z-10">
                    <button onClick={onDecrement} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5"><Minus className="w-12 h-12 text-white/40 active:text-white" /></button>

                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                        <div className="mb-1 w-full max-w-[90%]">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-white/50 font-mono text-[10px] font-black tracking-widest truncate">{lastScan.barcode}</span>
                            </div>
                            <h1 className="text-white font-black text-xs md:text-sm uppercase tracking-tight line-clamp-1 italic leading-none">
                                {activeProduct?.name || 'REGISTRANDO SKU...'}
                            </h1>
                        </div>

                        <div className="text-[12rem] md:text-[14rem] font-black tabular-nums tracking-tighter drop-shadow-2xl">{accumulatedQty}</div>
                        
                        {expectedItem && (
                            <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                                {accumulatedQty >= expectedItem.expectedQty ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Target className="w-3 h-3 text-blue-400" />}
                                META: {expectedItem.expectedQty}
                            </div>
                        )}
                    </div>

                    <button onClick={onIncrement} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5"><Plus className="w-12 h-12 text-white/40 active:text-white" /></button>
                </div>

                {isUnknown && (
                    <button onClick={onRegisterPending} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-[8px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full active:bg-white active:text-black">Identificar Nuevo Producto</button>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-20">
            <Package className="w-16 h-16 mb-4 animate-pulse text-slate-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Scan_Engine_Ready</h2>
        </div>
    );
});
