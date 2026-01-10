
import React, { memo } from 'react';
import { RotateCcw, Package, Sparkles, History, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ScanRecord, ExpectedItem, Product } from '../../types';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProduct?: Product;
    accumulatedQty?: number;
    feedback: 'idle' | 'success' | 'error' | 'undo';
    onRegisterPending: () => void;
    expectedItem?: ExpectedItem | null;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProduct,
    accumulatedQty = 0,
    feedback, 
    onRegisterPending, 
    expectedItem
}) => {
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <div className="p-12 bg-slate-900 rounded-full mb-6 border-8 border-slate-700 shadow-2xl">
                    <RotateCcw className="w-20 h-20 text-white" />
                </div>
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">BORRADO</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name === 'PENDIENTE';
        const isMasterMatch = activeProduct && activeProduct.name !== 'PENDIENTE';
        
        return (
            <div className="w-full flex flex-col items-center justify-center px-4 animate-in fade-in duration-300">
                <div className="mb-10 h-12">
                    {isMasterMatch ? (
                        <div className="bg-emerald-600 text-white px-6 py-2 rounded-full font-black text-[10px] flex items-center gap-2 shadow-lg uppercase tracking-widest border-b-4 border-emerald-900">
                            <ShieldCheck className="w-4 h-4" /> SKU Validado en Máster
                        </div>
                    ) : (
                        <div className="bg-rose-500 text-white px-6 py-2 rounded-full font-black text-[10px] flex items-center gap-2 shadow-lg uppercase tracking-widest border-b-4 border-rose-900 animate-pulse">
                             Item fuera de catálogo
                        </div>
                    )}
                </div>

                <div className="text-center max-w-2xl mb-8">
                    <h1 className={`text-5xl md:text-6xl font-black uppercase leading-tight mb-4 tracking-tighter ${isUnknown ? 'text-slate-300 italic' : 'text-black'}`}>
                        {activeProduct?.name || 'ÍTEM NUEVO'}
                    </h1>
                    <span className="font-mono font-black text-blue-700 bg-blue-50 px-8 py-2 rounded-2xl border-2 border-blue-100 text-2xl tracking-widest shadow-inner">
                        {lastScan.barcode}
                    </span>
                </div>

                <div className="relative flex flex-col items-center">
                    <div key={accumulatedQty} className="text-[15rem] md:text-[22rem] leading-[0.7] font-black text-black tabular-nums tracking-tighter select-none drop-shadow-2xl">
                        {accumulatedQty}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white bg-black px-12 py-4 rounded-[2rem] mt-16 shadow-2xl border-b-8 border-slate-800">
                        Total en Bulto
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center opacity-10 py-20">
            <History className="w-40 h-40 text-blue-600 mb-6" />
            <h2 className="text-4xl font-black uppercase tracking-[0.3em] text-black italic">LISTO PARA ESCANEAR</h2>
        </div>
    );
});
