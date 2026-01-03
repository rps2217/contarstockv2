
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
            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-500">
                <div className="p-10 bg-slate-100 rounded-full mb-6">
                    <RotateCcw className="w-16 h-16 text-slate-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-500 uppercase tracking-[0.3em]">Deshecho</h2>
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
            <div className="w-full flex flex-col items-center justify-center px-4 animate-in fade-in duration-500 overflow-hidden">
                {isUnknown ? (
                    <div className="bg-white border-4 border-orange-400 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-8 h-8" /></div>
                        <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Registro Manual</h2>
                        <div className="bg-slate-50 py-3 px-4 rounded-xl border border-slate-200 font-mono font-black text-slate-700 mb-8 break-all">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">Editar Descripción</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center max-w-2xl bg-white/40 p-8 rounded-[4rem] border border-white shadow-sm backdrop-blur-sm">
                        {expectedItem && (
                            <div className="mb-6">
                                {isOverCount ? (
                                    <div className="bg-rose-600 text-white px-6 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-xl animate-pulse uppercase tracking-widest">
                                        <AlertCircle className="w-4 h-4" /> Exceso Crítico
                                    </div>
                                ) : isTargetReached ? (
                                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-xl uppercase tracking-widest">
                                        <CheckCircle className="w-4 h-4" /> Cantidad Correcta
                                    </div>
                                ) : (
                                    <div className="bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-xl uppercase tracking-widest">
                                        <Info className="w-4 h-4" /> Objetivo: {targetQty}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-center w-full mb-4">
                             <h1 className="text-2xl md:text-4xl font-black text-slate-950 leading-tight uppercase tracking-tight line-clamp-2 px-4 drop-shadow-sm">{activeProductStats.name}</h1>
                             <div className="text-sm font-mono font-black text-blue-700 mt-3 bg-blue-100 px-4 py-1.5 rounded-xl inline-block border-2 border-blue-200 uppercase tracking-widest shadow-sm">{lastScan.barcode}</div>
                        </div>

                        <div className="relative flex flex-col items-center my-6 md:my-10">
                            {/* CONTRASTE MÁXIMO PARA LA CANTIDAD */}
                            <div className="text-[10rem] md:text-[16rem] leading-none font-black text-blue-600 tabular-nums tracking-tighter select-none drop-shadow-[0_10px_20px_rgba(37,99,235,0.15)]">
                                {currentQty}
                            </div>
                            <div className="text-xs font-black uppercase tracking-[0.6em] text-slate-400 -mt-4 bg-white/50 px-6 py-1 rounded-full border border-slate-100">Contabilizados</div>
                        </div>

                        {expectedItem && (
                            <div className="w-full max-w-sm h-4 bg-slate-200 rounded-full overflow-hidden mt-6 border-2 border-white shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out ${isOverCount ? 'bg-rose-500' : (isTargetReached ? 'bg-emerald-500' : 'bg-blue-600')}`}
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
        <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000">
            <div className="relative mb-8">
                <Package className="w-32 h-32 text-slate-900 opacity-[0.03]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-16 h-16 text-blue-500 animate-pulse" />
                </div>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-[0.5em] text-slate-200 italic select-none">LISTO</h2>
            <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">En espera de hardware físico</p>
                <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
            </div>
        </div>
    );
});
