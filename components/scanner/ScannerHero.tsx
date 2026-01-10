
import React, { memo } from 'react';
import { RotateCcw, ShieldCheck, History } from 'lucide-react';
import { ScanRecord, Product } from '../../types';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProduct?: Product;
    accumulatedQty?: number;
    feedback: 'idle' | 'success' | 'error' | 'undo';
    onRegisterPending: () => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProduct,
    accumulatedQty = 0,
    feedback, 
    onRegisterPending
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
                <div className="mb-8">
                    {isMasterMatch ? (
                        <div className="bg-emerald-50 text-emerald-700 px-5 py-2 rounded-full font-black text-[9px] flex items-center gap-2 shadow-sm border border-emerald-100 uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" /> SKU Validado
                        </div>
                    ) : (
                        <button 
                            onClick={onRegisterPending}
                            className="bg-rose-50 text-rose-600 px-5 py-2 rounded-full font-black text-[9px] flex items-center gap-2 shadow-sm border border-rose-100 uppercase tracking-widest animate-pulse"
                        >
                             Item Desconocido - Toca para Registrar
                        </button>
                    )}
                </div>

                <div className="text-center max-w-2xl mb-6">
                    <h1 className="text-5xl md:text-6xl font-black uppercase leading-tight mb-2 tracking-tighter text-black">
                        {activeProduct?.name || 'ÍTEM NUEVO'}
                    </h1>
                    <span className="font-mono font-bold text-blue-600 text-lg tracking-[0.2em] opacity-60">
                        {lastScan.barcode}
                    </span>
                </div>

                <div className="relative flex flex-col items-center mt-4">
                    <div key={accumulatedQty} className="text-[14rem] md:text-[20rem] leading-none font-black text-black tabular-nums tracking-tighter select-none drop-shadow-md animate-in zoom-in duration-200">
                        {accumulatedQty}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 mt-4 italic">
                        Unidades en Bulto
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
            <div className="relative mb-10 opacity-10">
                <History className="w-48 h-48 text-slate-900" />
            </div>
            <h2 className="text-5xl font-black uppercase tracking-[0.2em] text-slate-200 italic leading-none text-center">
                LISTO PARA<br/>ESCANEAR
            </h2>
        </div>
    );
});
