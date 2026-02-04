
import React, { memo } from 'react';
import { RotateCcw, CheckCircle, Minus, Plus, Sparkles, Tag } from 'lucide-react';
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
    lastScan, activeProduct, accumulatedQty, feedback, onRegisterPending, expectedItem, onDecrement, onIncrement
}) => {
    if (feedback === 'undo') return <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 animate-in zoom-in duration-300"><RotateCcw className="w-20 h-20 text-slate-500 mb-4" /><h2 className="text-2xl font-black text-slate-500">BORRADO</h2></div>;

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name.startsWith('PHARMA');
        const status = determineItemStatus(accumulatedQty, expectedItem?.expectedQty);
        const bgClass = getStatusColorClasses(status, 'bg');

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                <div className="flex-1 flex items-stretch relative z-10">
                    <button onClick={onDecrement} className="w-20 md:w-32 bg-black/5 active:bg-black/20 flex items-center justify-center border-r border-white/5 transition-all"><Minus className="w-12 h-12 text-white/30" /></button>

                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                        <div className="mb-1 w-full max-w-[90%]">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                {lastScan.batch && (
                                    <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                        <Tag className="w-2 h-2" /> LOTE: {lastScan.batch}
                                    </span>
                                )}
                                <span className="text-white/50 font-mono text-[9px] font-black tracking-widest truncate max-w-[120px]">{lastScan.barcode}</span>
                                {lastScan.mm && <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/70 text-[8px] font-black">EXP: {lastScan.mm}/{lastScan.yyyy}</span>}
                            </div>
                            <h1 className="text-white font-black text-[11px] md:text-sm uppercase tracking-tight line-clamp-1 leading-none italic">{activeProduct?.name || 'MEDICAMENTO_NUEVO'}</h1>
                        </div>

                        <div className="text-[12rem] md:text-[15rem] leading-none font-black tabular-nums tracking-tighter drop-shadow-2xl">{accumulatedQty}</div>
                        {expectedItem && <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">META: {expectedItem.expectedQty} {accumulatedQty >= expectedItem.expectedQty && <CheckCircle className="w-3 h-3 text-emerald-400" />}</div>}
                    </div>

                    <button onClick={onIncrement} className="w-20 md:w-32 bg-black/5 active:bg-black/20 flex items-center justify-center border-l border-white/5 transition-all"><Plus className="w-12 h-12 text-white/30" /></button>
                </div>
                {isUnknown && <button onClick={onRegisterPending} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white/60 text-[7px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full active:scale-95">Identificar SKU</button>}
            </div>
        );
    }

    return <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-20"><Tag className="w-16 h-16 mb-4 animate-pulse" /><h2 className="text-[10px] font-black uppercase tracking-[0.6em]">PHARMA_SCANNER_READY</h2></div>;
});
