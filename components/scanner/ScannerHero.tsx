
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, Package, CheckCircle } from 'lucide-react';
import { ScanRecord, Product } from '../../types';
import { ScannerFeedback } from '../../hooks/useScanner';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProduct: Product | undefined;
    accumulatedQty: number;
    feedback: ScannerFeedback;
    onRegisterPending: () => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProduct, 
    accumulatedQty,
    feedback, 
    onRegisterPending
}) => {
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in duration-500">
                <div className="p-12 bg-slate-100 rounded-full mb-8 shadow-inner">
                    <RotateCcw className="w-20 h-20 text-slate-400" />
                </div>
                <h2 className="text-3xl font-black text-slate-400 uppercase tracking-widest">Acción Deshecha</h2>
            </div>
        );
    }

    if (lastScan) {
        // Lógica de presentación: determinar si es un producto "desconocido" o "pendiente"
        const isUnknown = !activeProduct || activeProduct.category === 'POR_CLASIFICAR' || activeProduct.name.startsWith('PENDIENTE');
        const displayName = activeProduct?.name || 'DESCONOCIDO';

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col items-center px-4">
                {isUnknown ? (
                    <div className="bg-white border-2 border-orange-200 p-10 md:p-14 rounded-[3rem] shadow-2xl w-full max-w-2xl text-center">
                        <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8"><AlertCircle className="w-10 h-10" /></div>
                        <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Producto Nuevo</h2>
                        <p className="text-slate-400 mb-10 font-bold text-2xl bg-slate-50 py-3 rounded-2xl border border-slate-100">{lastScan.barcode}</p>
                        <button onClick={onRegisterPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-100 transition-all active:scale-95 uppercase tracking-widest text-sm">Registrar en Catálogo</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 text-center mb-6 leading-[1.1] max-w-5xl tracking-tight">
                            {displayName}
                        </h1>
                        
                        <div className="text-xl md:text-2xl text-blue-600 font-black bg-blue-50/50 px-10 py-3 rounded-2xl border border-blue-100 mb-12 tracking-wider">
                            {lastScan.barcode}
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Total Registrado</div>
                            <div className="text-[11rem] md:text-[16rem] leading-none font-black text-slate-900 flex items-baseline select-none tabular-nums tracking-tighter drop-shadow-sm">
                                {accumulatedQty}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center opacity-10 py-32">
            <Package className="w-32 h-32 mb-8 text-slate-900" />
            <h2 className="text-3xl font-black uppercase tracking-[0.5em] text-slate-900">Escáner Listo</h2>
        </div>
    );
});
