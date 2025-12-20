import React, { memo } from 'react';
import { RotateCcw, AlertCircle, Leaf, CheckCircle, Package } from 'lucide-react';
import { ScanRecord, ExpectedItem } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProductStats: { totalQty: number; name: string; isUnknown: boolean };
    feedback: 'idle' | 'success' | 'error' | 'undo';
    onRegisterPending: () => void;
    onToggleIncident: (e: React.MouseEvent, id: string, status: boolean) => void;
    expectedItem?: ExpectedItem | null;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProductStats, 
    feedback, 
    onRegisterPending, 
    onToggleIncident,
    expectedItem
}) => {
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in duration-500">
                <div className="p-12 bg-slate-800 rounded-[3rem] border-2 border-white/10 mb-8 shadow-2xl">
                    <RotateCcw className="w-20 h-20 text-slate-300" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-slate-300">Reversión</h2>
                <p className="text-slate-400 mt-4 text-xl font-bold italic">Registro eliminado</p>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = activeProductStats.isUnknown;
        const currentQty = activeProductStats.totalQty;
        const targetQty = expectedItem?.expectedQty || 0;
        
        const isOverCount = expectedItem && currentQty > targetQty;
        const isTargetReached = expectedItem && currentQty === targetQty;
        const progress = targetQty > 0 ? Math.min(100, (currentQty / targetQty) * 100) : 0;

        return (
            <div className={`animate-in fade-in duration-500 w-full flex flex-col items-center px-4`}>
                {isUnknown ? (
                    <div className="bg-slate-900 border-2 border-amber-500/40 p-10 md:p-16 rounded-[3rem] shadow-2xl w-full max-w-2xl text-center">
                        <AlertCircle className="w-24 h-24 text-amber-500 mx-auto mb-8" />
                        <h2 className="text-4xl font-black text-amber-200 mb-4">SKU Externo</h2>
                        <div className="sku-font text-3xl mb-10 bg-black/40 py-6 px-4 rounded-2xl text-amber-400 border border-amber-500/20">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-amber-600 hover:bg-amber-500 text-black font-black text-2xl py-6 rounded-2xl shadow-xl transition-all active:scale-95">Vincular Ahora</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        {expectedItem && (
                            <div className="mb-8 flex gap-4">
                                {isOverCount ? (
                                    <div className="bg-rose-600 text-white px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-rose-900/40">
                                        <AlertCircle className="w-6 h-6" /> EXCESO DETECTADO
                                    </div>
                                ) : isTargetReached ? (
                                    <div className="bg-emerald-600 text-white px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-900/40">
                                        <CheckCircle className="w-6 h-6" /> META CUMPLIDA
                                    </div>
                                ) : (
                                    <div className="bg-slate-800 text-slate-100 border-2 border-white/10 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest">
                                        Guía: {targetQty} unidades
                                    </div>
                                )}
                            </div>
                        )}

                        <h1 className="text-4xl md:text-7xl font-extrabold leading-[1.1] mb-10 text-white text-center tracking-tight max-w-4xl drop-shadow-lg">
                            {activeProductStats.name}
                        </h1>
                        
                        <div className="sku-font text-2xl md:text-4xl text-blue-400 bg-blue-900/20 px-8 py-4 rounded-2xl border border-blue-500/30 mb-12 shadow-inner">
                            {lastScan.barcode}
                        </div>

                        {expectedItem && (
                            <div className="w-full max-w-xl h-4 bg-slate-900 border-2 border-white/5 rounded-full overflow-hidden mb-16 shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-1000 ${isOverCount ? 'bg-rose-500' : (isTargetReached ? 'bg-emerald-500' : 'bg-blue-500')}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        <div className="flex flex-col items-center">
                            <div className="text-xl font-black uppercase tracking-[0.4em] text-slate-500 mb-4 flex items-center gap-3">
                                <Package className="w-8 h-8" /> Cantidad Actual
                            </div>
                            <div className="text-[12rem] md:text-[18rem] leading-[0.8] font-black text-white font-sans flex items-baseline select-none tabular-nums drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                {currentQty}
                                {expectedItem && (
                                    <span className="text-5xl md:text-8xl text-slate-700 ml-8 font-extrabold">
                                        /{targetQty}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center opacity-30 animate-in fade-in duration-1000 py-20">
            <Leaf className="w-32 h-32 mb-10 text-slate-400" />
            <h2 className="text-4xl font-black tracking-[0.3em] uppercase text-slate-500 text-center">Modo Espera</h2>
            <p className="mt-8 text-xl font-bold uppercase tracking-widest text-slate-600">Escanee para reanudar</p>
        </div>
    );
});