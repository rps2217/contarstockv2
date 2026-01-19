
import React, { memo } from 'react';
import { RotateCcw, ShieldCheck, History, AlertCircle, Box } from 'lucide-react';
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
    
    // ESTADO: DESHACER
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-200">
                <div className="bg-slate-200 p-8 rounded-full mb-4">
                    <RotateCcw className="w-16 h-16 text-slate-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Deshecho</h2>
            </div>
        );
    }

    // ESTADO: ESCANEO ACTIVO
    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name === 'PENDIENTE';
        
        // Colores de estado masivos para visión periférica
        const containerClass = feedback === 'success' 
            ? 'bg-emerald-50 border-emerald-500' 
            : (isUnknown ? 'bg-orange-50 border-orange-400' : 'bg-white border-slate-200');

        const textClass = feedback === 'success' ? 'text-emerald-900' : 'text-slate-900';

        return (
            <div className={`w-full h-full flex flex-col items-center justify-center px-4 py-6 transition-colors duration-300 rounded-[3rem] border-4 ${containerClass} shadow-sm`}>
                
                {/* Indicador Superior */}
                <div className="mb-4">
                    {!isUnknown ? (
                        <div className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 ${feedback === 'success' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                            <ShieldCheck className="w-3 h-3" /> SKU Verificado
                        </div>
                    ) : (
                        <button 
                            onClick={onRegisterPending}
                            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg animate-pulse"
                        >
                             <AlertCircle className="w-4 h-4" /> Registrar Ítem
                        </button>
                    )}
                </div>

                {/* Nombre del Producto (Legibilidad Máxima) */}
                <div className="text-center w-full mb-6">
                    <h1 className={`text-3xl md:text-5xl font-black uppercase leading-tight tracking-tight line-clamp-3 ${textClass}`}>
                        {activeProduct?.name || 'PRODUCTO DESCONOCIDO'}
                    </h1>
                    <div className="mt-2 inline-block font-mono font-bold text-slate-400 text-lg tracking-widest">
                        {lastScan.barcode}
                    </div>
                </div>

                {/* Contador Gigante (Foco Principal) */}
                <div className="relative flex flex-col items-center bg-white/50 rounded-3xl px-12 py-4 border border-black/5">
                    <div 
                        key={accumulatedQty} 
                        className={`text-[10rem] md:text-[14rem] leading-none font-black tabular-nums tracking-tighter select-none transition-transform duration-100 ${feedback === 'success' ? 'scale-110 text-emerald-600' : 'text-slate-900'}`}
                    >
                        {accumulatedQty}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 -mt-2">
                        Total SKU
                    </div>
                </div>
            </div>
        );
    }

    // ESTADO: REPOSO (Llamado a la acción claro)
    return (
        <div className="flex flex-col items-center justify-center h-full opacity-20">
            <div className="border-4 border-dashed border-slate-900 rounded-[2rem] p-12 mb-6">
                <Box className="w-24 h-24 text-slate-900" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900 text-center">
                Esperando<br/>Escaneo
            </h2>
        </div>
    );
});
