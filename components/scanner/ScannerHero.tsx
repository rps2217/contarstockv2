
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
                <h2 className="text-2xl font-black text-slate-400 uppercase tracking-[0.3em]">Deshecho</h2>
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
                    <div className="bg-white border-2 border-orange-200 p-8 rounded-[2.5rem] shadow-xl w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-8 h-8" /></div>
                        <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">SKU Desconocido</h2>
                        <div className="bg-slate-50 py-3 px-4 rounded-xl border border-slate-100 font-mono font-bold text-slate-600 mb-8 break-all">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">Dar de Alta</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center max-w-xl">
                        {expectedItem && (
                            <div className="mb-4">
                                {isOverCount ? (
                                    <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-[10px] flex items-center gap-2 shadow-lg animate-pulse uppercase tracking-widest">
                                        <AlertCircle className="w-3 h-3" /> Exceso Detectado
                                    </div>
                                ) : isTargetReached ? (
                                    <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] flex items-center gap-2 shadow-lg uppercase tracking-widest">
                                        <CheckCircle className="w-3 h-3" /> Meta Alcanzada
                                    </div>
                                ) : (
                                    <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-black text-[10px] flex items-center gap-2 shadow-lg uppercase tracking-widest">
                                        <Info className="w-3 h-3" /> Requerido: {targetQty}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-center w-full mb-2">
                             <h1 className="text-xl md:text-3xl font-black text-slate-900 leading-tight uppercase tracking-tight line-clamp-2 px-6">{activeProductStats.name}</h1>
                             <div className="text-[10px] font-mono font-black text-blue-600 mt-2 bg-blue-50 px-3 py-1 rounded-lg inline-block border border-blue-100 uppercase tracking-widest">{lastScan.barcode}</div>
                        </div>

                        <div className="relative flex flex-col items-center my-4 md:my-8">
                            <div className="text-[9rem] md:text-[14rem] leading-none font-black text-slate-900 tabular-nums tracking-tighter select-none drop-shadow-sm">
                                {currentQty}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 -mt-2">Contabilizados</div>
                        </div>

                        {expectedItem && (
                            <div className="w-full max-w-xs h-2.5 bg-slate-200 rounded-full overflow-hidden mt-4 border border-white shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-700 ease-out ${isOverCount ? 'bg-rose-500' : (isTargetReached ? 'bg-emerald-500' : 'bg-blue-600')}`}
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
                <Package className="w-32 h-32 text-slate-900 opacity-5" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-12 h-12 text-blue-500 animate-pulse" />
                </div>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[0.4em] text-slate-200 italic">STANDBY</h2>
            <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Escucha de hardware activa</p>
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-blue-500/40 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-blue-500/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-blue-500/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
            </div>
        </div>
    );
});
