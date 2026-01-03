
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, Package, CheckCircle, Info, Zap } from 'lucide-react';
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
            <div className="flex flex-col items-center justify-center h-full">
                <div className="p-12 bg-slate-200 rounded-full mb-6 border-4 border-slate-300">
                    <RotateCcw className="w-20 h-20 text-slate-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-700 uppercase tracking-widest">DESHECHO</h2>
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
            <div className="w-full flex flex-col items-center justify-center px-4 overflow-hidden">
                {isUnknown ? (
                    <div className="bg-white border-[6px] border-orange-500 p-10 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center">
                        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8"><AlertCircle className="w-10 h-10" /></div>
                        <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase">Código Nuevo</h2>
                        <div className="bg-slate-100 py-5 px-6 rounded-2xl border-2 border-slate-200 font-mono font-black text-3xl text-slate-800 mb-10 break-all">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl shadow-xl active:scale-95 text-lg uppercase tracking-widest">Identificar Producto</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center max-w-3xl bg-white p-10 rounded-[4rem] border-4 border-slate-100 shadow-xl">
                        {expectedItem && (
                            <div className="mb-8">
                                {isOverCount ? (
                                    <div className="bg-rose-700 text-white px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 shadow-xl animate-pulse uppercase tracking-tight">
                                        <AlertCircle className="w-6 h-6" /> EXCESO: {currentQty - targetQty}
                                    </div>
                                ) : isTargetReached ? (
                                    <div className="bg-emerald-600 text-white px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 shadow-xl uppercase tracking-tight">
                                        <CheckCircle className="w-6 h-6" /> ¡COMPLETO!
                                    </div>
                                ) : (
                                    <div className="bg-blue-700 text-white px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 shadow-xl uppercase tracking-tight">
                                        <Info className="w-6 h-6" /> FALTA: {targetQty - currentQty}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-center w-full mb-6">
                             <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight uppercase tracking-tight line-clamp-2 px-2">{activeProductStats.name}</h1>
                             <div className="text-lg font-mono font-black text-blue-800 mt-4 bg-blue-50 px-6 py-2 rounded-xl inline-block border-2 border-blue-200 uppercase tracking-widest">{lastScan.barcode}</div>
                        </div>

                        <div className="relative flex flex-col items-center my-4">
                            {/* EL NÚMERO MÁS GRANDE Y LEGIBLE POSIBLE */}
                            <div className="text-[12rem] md:text-[18rem] leading-none font-black text-slate-950 tabular-nums tracking-tighter select-none drop-shadow-md">
                                {currentQty}
                            </div>
                            <div className="text-sm font-black uppercase tracking-[0.4em] text-slate-600 -mt-2 bg-slate-100 px-8 py-2 rounded-full border-2 border-slate-200">UNIDADES CONTADAS</div>
                        </div>

                        {expectedItem && (
                            <div className="w-full max-w-md h-6 bg-slate-200 rounded-full overflow-hidden mt-8 border-4 border-white shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-700 ease-out ${isOverCount ? 'bg-rose-600' : (isTargetReached ? 'bg-emerald-500' : 'bg-blue-600')}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 p-16 rounded-[4rem] border-4 border-slate-200 mb-8">
                <Zap className="w-24 h-24 text-blue-600 animate-pulse" />
            </div>
            <h2 className="text-5xl font-black uppercase tracking-[0.2em] text-slate-900 italic">LISTO</h2>
            <p className="text-xl font-bold text-slate-500 mt-4 uppercase tracking-widest text-center">Apunte el escáner a un producto</p>
        </div>
    );
});
