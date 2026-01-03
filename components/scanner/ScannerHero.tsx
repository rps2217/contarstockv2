
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';
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
                <div className="p-12 bg-slate-900 rounded-full mb-6 border-8 border-slate-700">
                    <RotateCcw className="w-24 h-24 text-white" />
                </div>
                <h2 className="text-4xl font-black text-black uppercase tracking-tighter">BORRADO</h2>
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
            <div className="w-full flex flex-col items-center justify-center px-2 py-4">
                {isUnknown ? (
                    <div className="bg-white border-8 border-orange-600 p-8 rounded-[3.5rem] shadow-2xl w-full max-w-sm text-center">
                        <AlertCircle className="w-20 h-20 text-orange-600 mx-auto mb-6" />
                        <h2 className="text-3xl font-black text-black mb-4 uppercase">CÓDIGO NUEVO</h2>
                        <div className="bg-slate-100 py-6 px-4 rounded-2xl border-4 border-slate-300 font-mono font-black text-3xl text-slate-800 mb-8 break-all">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-black text-white font-black py-6 rounded-2xl text-xl uppercase tracking-widest border-b-8 border-slate-700 active:border-b-0 active:translate-y-2 transition-all">IDENTIFICAR</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        {/* INDICADORES DE ESTADO GIGANTES */}
                        <div className="mb-4">
                            {isOverCount ? (
                                <div className="bg-red-700 text-white px-8 py-3 rounded-full font-black text-2xl border-4 border-red-950 flex items-center gap-3 animate-pulse uppercase">
                                    EXCESO: {currentQty - targetQty}
                                </div>
                            ) : isTargetReached ? (
                                <div className="bg-emerald-600 text-white px-8 py-3 rounded-full font-black text-2xl border-4 border-emerald-950 flex items-center gap-3 uppercase">
                                    <CheckCircle className="w-8 h-8" /> LISTO
                                </div>
                            ) : expectedItem ? (
                                <div className="bg-blue-700 text-white px-8 py-3 rounded-full font-black text-2xl border-4 border-blue-950 flex items-center gap-3 uppercase">
                                    FALTAN: {targetQty - currentQty}
                                </div>
                            ) : null}
                        </div>

                        <div className="text-center w-full mb-2">
                             <h1 className="text-3xl font-black text-black leading-tight uppercase px-4 line-clamp-2">{activeProductStats.name}</h1>
                             <div className="text-xl font-mono font-black text-blue-800 mt-2 bg-blue-100 px-6 py-2 rounded-xl inline-block border-2 border-blue-300 uppercase tracking-widest">{lastScan.barcode}</div>
                        </div>

                        {/* EL NÚMERO: MÁXIMA ESCALA POSIBLE */}
                        <div className="relative flex flex-col items-center">
                            <div className="text-[15rem] leading-[0.8] font-black text-black tabular-nums tracking-tighter select-none scale-y-110">
                                {currentQty}
                            </div>
                            <div className="text-sm font-black uppercase tracking-[0.5em] text-white bg-black px-10 py-2 rounded-full mt-8">CONTADOS</div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40">
            <Zap className="w-32 h-32 text-blue-600 mb-8" />
            <h2 className="text-6xl font-black uppercase tracking-widest text-black italic">LISTO</h2>
        </div>
    );
});
