
import React, { memo } from 'react';
import { RotateCcw, ShieldCheck, History, AlertCircle } from 'lucide-react';
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
        
        return (
            <div className="w-full flex flex-col items-center justify-center px-4 animate-in fade-in duration-300">
                <div className="mb-10">
                    {!isUnknown ? (
                        <div className="bg-emerald-50 text-emerald-700 px-6 py-2.5 rounded-full font-black text-[10px] flex items-center gap-2 shadow-sm border border-emerald-100 uppercase tracking-[0.2em]">
                            <ShieldCheck className="w-4 h-4" /> SKU Verificado
                        </div>
                    ) : (
                        <button 
                            onClick={onRegisterPending}
                            className="bg-orange-50 text-orange-600 px-6 py-2.5 rounded-full font-black text-[10px] flex items-center gap-2 shadow-lg border border-orange-200 uppercase tracking-[0.2em] animate-pulse"
                        >
                             <AlertCircle className="w-4 h-4" /> Registrar Ítem
                        </button>
                    )}
                </div>

                <div className="text-center max-w-3xl mb-8">
                    <h1 className="text-5xl md:text-7xl font-black uppercase leading-[1] mb-3 tracking-tighter text-slate-900">
                        {activeProduct?.name || 'PRODUCTO NUEVO'}
                    </h1>
                    <div className="inline-block font-mono font-black text-blue-600 text-2xl tracking-[0.3em] bg-blue-50 px-6 py-1.5 rounded-xl border border-blue-100">
                        {lastScan.barcode}
                    </div>
                </div>

                <div className="relative flex flex-col items-center">
                    {/* El contador ahora vibra visualmente al cambiar */}
                    <div 
                        key={accumulatedQty} 
                        className="text-[16rem] md:text-[24rem] leading-none font-black text-black tabular-nums tracking-tighter select-none drop-shadow-xl animate-in zoom-in duration-150"
                    >
                        {accumulatedQty}
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-300 mt-2 italic">
                        Unidades en Bulto
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
            <div className="relative mb-12 opacity-5">
                <History className="w-64 h-64 text-slate-900" />
            </div>
            <h2 className="text-6xl font-black uppercase tracking-[0.1em] text-slate-200 italic leading-none text-center">
                LISTO PARA<br/>RECONOCER
            </h2>
        </div>
    );
});
