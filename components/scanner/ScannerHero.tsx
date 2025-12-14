
import React, { memo } from 'react';
import { RotateCcw, AlertTriangle, Zap } from 'lucide-react';
import { ScanRecord } from '../../types';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProductStats: { totalQty: number; name: string; isUnknown: boolean };
    feedback: 'idle' | 'success' | 'error' | 'undo';
    onRegisterPending: () => void;
    onToggleIncident: (e: React.MouseEvent, id: string, status: boolean) => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProductStats, 
    feedback, 
    onRegisterPending, 
    onToggleIncident 
}) => {
    
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in duration-200">
                <RotateCcw className="w-32 h-32 text-white mb-4" />
                <h2 className="text-4xl font-black uppercase tracking-widest">Deshecho</h2>
                <p className="text-white/70 mt-2">El último registro ha sido eliminado.</p>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = activeProductStats.isUnknown;
        const isLastScanIncident = !!lastScan.isIncident;

        return (
            <div className="animate-in zoom-in-95 duration-150 w-full max-w-2xl flex flex-col items-center">
                {isUnknown ? (
                    /* UNKNOWN PRODUCT STATE */
                    <div className="bg-amber-500/90 text-black p-8 rounded-3xl shadow-2xl border-4 border-amber-300 w-full">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <AlertTriangle className="w-20 h-20 animate-pulse" />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Producto Desconocido</h2>
                        </div>
                        <div className="font-mono text-3xl font-bold mb-8 bg-black/10 py-2 rounded-xl">{lastScan.barcode}</div>
                        <button 
                            onClick={onRegisterPending} 
                            className="w-full bg-black text-amber-500 hover:bg-slate-900 font-black text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-all"
                        >
                            REGISTRAR COMO PENDIENTE
                        </button>
                    </div>
                ) : (
                    /* SUCCESS SCAN STATE */
                    <>
                        {/* Product Name */}
                        <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4 text-white drop-shadow-md break-words line-clamp-3">
                            {activeProductStats.name}
                        </h1>
                        
                        {/* Metadata Row: Barcode & Incident Toggle */}
                        <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
                            {/* Barcode Badge */}
                            <div className="bg-white/10 px-4 py-2 rounded-xl font-mono text-sm md:text-base text-white/80 border border-white/5">
                                {lastScan.barcode}
                            </div>

                            {/* Incident Toggle Button */}
                            <button 
                                onClick={(e) => onToggleIncident(e, lastScan.id, isLastScanIncident)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm md:text-base flex items-center gap-2 transition-all active:scale-95 border border-white/10 shadow-lg ${
                                    isLastScanIncident 
                                    ? 'bg-white text-amber-700 shadow-amber-900/20' 
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                            >
                                <AlertTriangle className={`w-5 h-5 ${isLastScanIncident ? 'fill-amber-700' : ''}`} />
                                {isLastScanIncident ? 'CON INCIDENCIA' : 'MARCAR FRC'}
                            </button>
                        </div>

                        {/* QUANTITY DISPLAY (HERO) */}
                        <div className="flex flex-col items-center">
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50 mb-1">Total Acumulado</div>
                            <div className="text-[7rem] md:text-[9rem] leading-none font-black tracking-tighter text-white drop-shadow-2xl font-mono">
                                {activeProductStats.totalQty}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    /* IDLE / READY STATE */
    return (
        <div className="flex flex-col items-center opacity-20">
            <Zap className="w-32 h-32 mb-6" />
            <h2 className="text-4xl font-black tracking-widest uppercase">Listo</h2>
            <p className="mt-2 text-sm font-mono">Esperando Escáner...</p>
        </div>
    );
});
