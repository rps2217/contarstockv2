
import React, { memo, useEffect } from 'react';
import { RotateCcw, AlertCircle, Box } from 'lucide-react';
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
    
    useEffect(() => {
        if (feedback === 'success' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    }, [feedback, accumulatedQty]);

    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-none">
                <div className="bg-amber-500 p-12 border-8 border-black">
                    <RotateCcw className="w-20 h-20 text-black" />
                </div>
                <h2 className="text-4xl font-black text-amber-500 uppercase tracking-tighter mt-6">ACCIÓN_DESHECHA</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name === 'PENDIENTE';
        
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center px-4 py-8 transition-none ${
                feedback === 'success' ? 'bg-emerald-600' : (isUnknown ? 'bg-amber-500' : 'bg-black')
            } border-[12px] border-white/5`}>
                
                {/* STATUS BAR TÁCTICA */}
                <div className="mb-8">
                    {!isUnknown ? (
                        <div className="bg-white text-black px-6 py-2 font-black text-xs uppercase tracking-[0.4em] border-4 border-black">
                            ITEM_VALIDO
                        </div>
                    ) : (
                        <button 
                            onClick={onRegisterPending}
                            className="bg-black text-white px-8 py-4 border-4 border-white font-black text-sm uppercase tracking-widest active:bg-white active:text-black"
                        >
                             REGISTRAR_NUEVO
                        </button>
                    )}
                </div>

                {/* TEXTO DE ALTA DENSIDAD */}
                <div className="text-center w-full mb-2">
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-none tracking-tighter mb-4">
                        {activeProduct?.name || 'DESCONOCIDO'}
                    </h1>
                    <div className="inline-block bg-white/10 px-4 py-2 border-2 border-white/20 text-blue-400 font-black text-2xl tracking-widest">
                        {lastScan.barcode}
                    </div>
                </div>

                {/* EL NÚMERO (PROTOCOLO MARTILLO) */}
                <div className="flex flex-col items-center justify-center w-full mt-4">
                    <div className="text-[18rem] md:text-[25rem] leading-none font-black text-white tabular-nums tracking-tighter">
                        {accumulatedQty}
                    </div>
                    <div className="text-[14px] font-black uppercase tracking-[0.8em] text-white/40 -mt-8">
                        QTY_IN_HUB
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full opacity-20">
            <div className="border-8 border-white p-20 mb-8">
                <Box className="w-32 h-32 text-white" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-[0.5em] text-white text-center italic">
                READY_FOR_LASER
            </h2>
        </div>
    );
});
