
import React, { memo, useEffect } from 'react';
import { RotateCcw, ShieldCheck, AlertCircle, Box } from 'lucide-react';
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
    
    // PROTOCOLO HÁPTICO: Vibración física al confirmar incremento
    useEffect(() => {
        if (feedback === 'success' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    }, [feedback, accumulatedQty]);

    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-200">
                <div className="bg-slate-900 p-12 rounded-full mb-6 border-8 border-amber-500 shadow-2xl">
                    <RotateCcw className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic">Deshecho</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name === 'PENDIENTE';
        
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center px-4 py-8 transition-all duration-150 rounded-[4rem] border-[6px] ${
                feedback === 'success' ? 'bg-emerald-500 border-black' : (isUnknown ? 'bg-amber-400 border-black' : 'bg-white border-slate-900')
            } shadow-2xl`}>
                
                {/* STATUS LED PILL */}
                <div className="mb-6">
                    {!isUnknown ? (
                        <div className={`px-6 py-2 rounded-full font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-3 border-2 ${feedback === 'success' ? 'bg-black text-white border-black' : 'bg-emerald-100 text-emerald-900 border-emerald-200'}`}>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            SKU VALIDADO
                        </div>
                    ) : (
                        <button 
                            onClick={onRegisterPending}
                            className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl active:scale-95"
                        >
                             <AlertCircle className="w-5 h-5 text-amber-400" /> REGISTRAR ÍTEM
                        </button>
                    )}
                </div>

                <div className="text-center w-full mb-4 px-6">
                    <h1 className={`text-4xl md:text-6xl font-black uppercase leading-[0.9] tracking-tighter line-clamp-2 ${feedback === 'success' ? 'text-white' : 'text-slate-900'}`}>
                        {activeProduct?.name || 'DESCONOCIDO'}
                    </h1>
                    <div className={`mt-3 inline-block font-mono font-black text-2xl tracking-[0.2em] ${feedback === 'success' ? 'text-black/40' : 'text-blue-600'}`}>
                        {lastScan.barcode}
                    </div>
                </div>

                {/* CONTADOR MONSTRUOSO (Martillo Industrial) */}
                <div className={`relative flex flex-col items-center justify-center w-full transition-transform ${feedback === 'success' ? 'scale-110' : ''}`}>
                    <div className={`text-[15rem] md:text-[20rem] leading-[0.8] font-black tabular-nums tracking-tighter select-none font-mono drop-shadow-[0_10px_0_rgba(0,0,0,0.1)] ${feedback === 'success' ? 'text-black' : 'text-slate-900'}`}>
                        {accumulatedQty}
                    </div>
                    <div className={`text-[12px] font-black uppercase tracking-[0.6em] -mt-2 ${feedback === 'success' ? 'text-black/50' : 'text-slate-400'}`}>
                        UNIDADES EN BULTO
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full opacity-20">
            <div className="border-[8px] border-dashed border-slate-900 rounded-[4rem] p-20 mb-8">
                <Box className="w-32 h-32 text-slate-900" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-[0.3em] text-slate-900 text-center italic">
                SISTEMA<br/>LISTO
            </h2>
        </div>
    );
});
