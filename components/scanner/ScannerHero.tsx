
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, CheckCircle, Zap, Sparkles, Pencil } from 'lucide-react';
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
    // --- ESTADO: DESHACER ---
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <div className="p-12 bg-slate-900 rounded-full mb-6 border-8 border-slate-700">
                    <RotateCcw className="w-20 h-20 text-white" />
                </div>
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">BORRADO</h2>
            </div>
        );
    }

    // --- ESTADO: ACTIVO ---
    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name === 'PENDIENTE';
        const target = expectedItem?.expectedQty || 0;
        const diff = accumulatedQty - target;

        return (
            <div className="w-full flex flex-col items-center justify-center px-4 animate-in fade-in duration-300">
                {/* ALERT BAR */}
                <div className="mb-10 h-12">
                    {expectedItem && (
                        <div className={`px-6 py-2 rounded-2xl font-black text-sm border-4 flex items-center gap-2 shadow-lg animate-in slide-in-from-top-4 ${
                            diff > 0 ? 'bg-red-600 border-red-950 text-white animate-pulse' :
                            diff === 0 ? 'bg-emerald-600 border-emerald-950 text-white' :
                            'bg-blue-700 border-blue-950 text-white'
                        }`}>
                            {diff > 0 ? `SOBRAN: ${diff}` : diff === 0 ? 'OBJETIVO CUMPLIDO' : `FALTAN: ${Math.abs(diff)}`}
                        </div>
                    )}
                    {isUnknown && !expectedItem && (
                        <div className="bg-amber-500 text-black px-5 py-2 rounded-xl font-black text-[10px] border-2 border-black uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Producto Nuevo Detectado
                        </div>
                    )}
                </div>

                {/* PRODUCT IDENTIFIER */}
                <div className="text-center max-w-2xl mb-8">
                    <h1 className={`text-4xl md:text-5xl font-black uppercase leading-tight mb-4 tracking-tight ${isUnknown ? 'text-slate-400 italic' : 'text-black'}`}>
                        {activeProduct?.name || 'DESCONOCIDO'}
                    </h1>
                    
                    <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-black text-blue-800 bg-blue-50 px-6 py-2 rounded-xl border-2 border-blue-200 text-xl tracking-widest">
                            {lastScan.barcode}
                        </span>
                        {isUnknown && (
                            <button onClick={onRegisterPending} className="mt-4 flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                                <Pencil className="w-3 h-3" /> Identificar Item
                            </button>
                        )}
                    </div>
                </div>

                {/* THE BIG COUNTER */}
                <div className="relative flex flex-col items-center">
                    <div 
                        key={accumulatedQty} 
                        className="text-[14rem] md:text-[20rem] leading-[0.75] font-black text-black tabular-nums tracking-tighter select-none animate-in zoom-in-95 duration-150"
                    >
                        {accumulatedQty}
                    </div>
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-white bg-black px-12 py-3 rounded-full mt-14 shadow-xl">
                        Unidades Registradas
                    </div>
                </div>
            </div>
        );
    }

    // --- ESTADO: IDLE ---
    return (
        <div className="flex flex-col items-center justify-center opacity-10 animate-pulse">
            <Zap className="w-32 h-32 text-blue-600 mb-6" />
            <h2 className="text-4xl font-black uppercase tracking-widest text-black">ESPERANDO</h2>
        </div>
    );
});
