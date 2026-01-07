
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, CheckCircle, Zap, Sparkles } from 'lucide-react';
import { ScanRecord, ExpectedItem } from '../../types';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProductStats: { totalQty: number; name: string; isUnknown: boolean };
    feedback: 'idle' | 'success' | 'error' | 'undo';
    onRegisterPending: () => void;
    onToggleIncident: (e: React.MouseEvent, id: string, status: boolean) => void;
    expectedItem?: ExpectedItem | null;
    predictions?: {barcode: string, name: string}[];
    onPredictionClick?: (barcode: string) => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProductStats, 
    feedback, 
    onRegisterPending, 
    expectedItem,
    predictions = [],
    onPredictionClick
}) => {
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="p-8 md:p-12 bg-slate-900 rounded-full mb-6 border-4 md:border-8 border-slate-700 animate-in zoom-in">
                    <RotateCcw className="w-16 h-16 md:w-24 md:h-24 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tighter">BORRADO</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = activeProductStats.isUnknown;
        const currentQty = activeProductStats.totalQty;
        const targetQty = expectedItem?.expectedQty || 0;
        const isOverCount = expectedItem && currentQty > targetQty;
        const isTargetReached = expectedItem && currentQty === targetQty;

        return (
            <div className="w-full flex flex-col items-center justify-center px-2 py-4 animate-in fade-in duration-300">
                {isUnknown ? (
                    <div className="bg-white border-4 md:border-8 border-orange-600 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl w-full max-w-sm text-center">
                        <AlertCircle className="w-16 h-16 md:w-20 md:h-20 text-orange-600 mx-auto mb-4 md:mb-6" />
                        <h2 className="text-2xl md:text-3xl font-black text-black mb-4 uppercase tracking-tight">CÓDIGO NUEVO</h2>
                        <div className="bg-slate-100 py-5 px-4 rounded-xl border-2 border-slate-300 font-mono font-black text-2xl md:text-3xl text-slate-800 mb-6 break-all">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-black text-white font-black py-5 md:py-6 rounded-2xl text-lg md:text-xl uppercase tracking-widest active:translate-y-1 transition-all">IDENTIFICAR</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        <div className="mb-2 md:mb-4">
                            {isOverCount ? (
                                <div className="bg-red-700 text-white px-6 py-2 md:px-8 md:py-3 rounded-full font-black text-lg md:text-2xl border-4 border-red-950 flex items-center gap-3 animate-pulse uppercase">
                                    EXCESO: {currentQty - targetQty}
                                </div>
                            ) : isTargetReached ? (
                                <div className="bg-emerald-600 text-white px-6 py-2 md:px-8 md:py-3 rounded-full font-black text-lg md:text-2xl border-4 border-emerald-950 flex items-center gap-3 uppercase">
                                    <CheckCircle className="w-6 h-6 md:w-8 md:h-8" /> LISTO
                                </div>
                            ) : expectedItem ? (
                                <div className="bg-blue-700 text-white px-6 py-2 md:px-8 md:py-3 rounded-full font-black text-lg md:text-2xl border-4 border-blue-950 flex items-center gap-3 uppercase tracking-tighter">
                                    FALTAN: {targetQty - currentQty}
                                </div>
                            ) : null}
                        </div>

                        <div className="text-center w-full mb-2">
                             <h1 className="text-2xl md:text-3xl font-black text-black leading-tight uppercase px-4 line-clamp-2 min-h-[3.5rem] flex items-center justify-center">{activeProductStats.name}</h1>
                             <div className="text-lg md:text-xl font-mono font-black text-blue-800 mt-1 md:mt-2 bg-blue-100 px-4 py-1.5 md:px-6 md:py-2 rounded-xl inline-block border-2 border-blue-300 uppercase tracking-widest">{lastScan.barcode}</div>
                        </div>

                        <div className="relative flex flex-col items-center mt-2 md:mt-4">
                            <div className="text-[10rem] md:text-[15rem] leading-[0.8] font-black text-black tabular-nums tracking-tighter select-none scale-y-110 drop-shadow-sm">
                                {currentQty}
                            </div>
                            <div className="text-[10px] md:sm font-black uppercase tracking-[0.5em] text-white bg-black px-6 md:px-10 py-1.5 md:py-2 rounded-full mt-6 md:mt-8">CONTADOS</div>
                        </div>

                        {predictions.length > 0 && (
                            <div className="mt-12 w-full max-w-lg animate-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-2 mb-3 px-4">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sugerencias IA</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
                                    {predictions.map(p => (
                                        <button 
                                            key={p.barcode}
                                            onClick={() => onPredictionClick?.(p.barcode)}
                                            className="bg-white border-2 border-slate-200 p-3 rounded-2xl min-w-[140px] text-left hover:border-indigo-500 transition-all active:scale-95"
                                        >
                                            <div className="text-[8px] font-black text-indigo-600 uppercase mb-1 truncate">{p.name}</div>
                                            <div className="text-xs font-mono font-bold text-slate-900">{p.barcode}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-10 animate-pulse">
            <Zap className="w-24 h-24 md:w-32 md:h-32 text-blue-600 mb-6 md:mb-8" />
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-black italic">LISTO</h2>
        </div>
    );
});
