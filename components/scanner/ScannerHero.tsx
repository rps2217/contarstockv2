import React, { memo } from 'react';
import { RotateCcw, AlertCircle, Package, CheckCircle } from 'lucide-react';
import { ScanRecord, ExpectedItem } from '../../types';

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
    expectedItem
}) => {
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <div className="p-8 bg-slate-100 rounded-full mb-6">
                    <RotateCcw className="w-16 h-16 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-400">Acción Revertida</h2>
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
            <div className="animate-in fade-in duration-300 w-full flex flex-col items-center px-4">
                {isUnknown ? (
                    <div className="bg-white border border-orange-200 p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-xl text-center">
                        <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Producto Nuevo</h2>
                        <p className="text-slate-500 mb-8 font-mono text-xl">{lastScan.barcode}</p>
                        <button onClick={onRegisterPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95">Registrar en Catálogo</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        {expectedItem && (
                            <div className="mb-6">
                                {isOverCount ? (
                                    <div className="bg-red-100 text-red-700 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-red-200">
                                        <AlertCircle className="w-4 h-4" /> EXCESO
                                    </div>
                                ) : isTargetReached ? (
                                    <div className="bg-green-100 text-green-700 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-green-200">
                                        <CheckCircle className="w-4 h-4" /> COMPLETADO
                                    </div>
                                ) : (
                                    <div className="bg-slate-100 text-slate-600 px-6 py-2 rounded-full font-bold text-sm border border-slate-200">
                                        Objetivo: {targetQty} unidades
                                    </div>
                                )}
                            </div>
                        )}

                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 text-center mb-4 leading-tight max-w-4xl">
                            {activeProductStats.name}
                        </h1>
                        
                        <div className="text-xl md:text-2xl text-blue-600 font-bold bg-blue-50 px-6 py-2 rounded-xl border border-blue-100 mb-10">
                            {lastScan.barcode}
                        </div>

                        {expectedItem && (
                            <div className="w-full max-w-md h-3 bg-slate-200 rounded-full overflow-hidden mb-12">
                                <div 
                                    className={`h-full transition-all duration-700 ${isOverCount ? 'bg-red-500' : (isTargetReached ? 'bg-green-500' : 'bg-blue-500')}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        <div className="flex flex-col items-center">
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cantidad Registrada</div>
                            <div className="text-[10rem] md:text-[14rem] leading-none font-black text-slate-900 flex items-baseline select-none tabular-nums">
                                {currentQty}
                                {expectedItem && (
                                    <span className="text-4xl md:text-6xl text-slate-300 ml-4">/{targetQty}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center opacity-20 py-20">
            <Package className="w-24 h-24 mb-6 text-slate-400" />
            <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-400">Escáner Listo</h2>
        </div>
    );
});