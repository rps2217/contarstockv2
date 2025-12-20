import React, { memo } from 'react';
import { RotateCcw, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
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
    const { settings } = useAppStore();
    const lowPerf = settings.lowPerformanceMode;
    
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <div className="p-8 bg-purple-500/20 rounded-full border border-purple-500/40 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                    <RotateCcw className="w-20 h-20 text-purple-400" />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-purple-400">Deshecho</h2>
                <p className="text-purple-300/60 mt-2 font-mono text-xs">Registro eliminado de la memoria local</p>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = activeProductStats.isUnknown;
        const isLastScanIncident = !!lastScan.isIncident;
        const currentQty = activeProductStats.totalQty;
        const targetQty = expectedItem?.expectedQty || 0;
        
        const isOverCount = expectedItem && currentQty > targetQty;
        const isTargetReached = expectedItem && currentQty === targetQty;
        const progress = targetQty > 0 ? Math.min(100, (currentQty / targetQty) * 100) : 0;

        return (
            <div className={`animate-in zoom-in-95 duration-200 w-full max-w-2xl flex flex-col items-center p-4 md:p-0`}>
                {isUnknown ? (
                    <div className="bg-slate-900/60 backdrop-blur-xl border-2 border-amber-500/50 p-8 md:p-12 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] w-full max-w-lg">
                        <div className="flex flex-col items-center gap-6 mb-8">
                            <div className="bg-amber-500/10 p-6 rounded-3xl border border-amber-500/20">
                                <AlertTriangle className={`w-20 h-20 text-amber-500 ${lowPerf ? '' : 'animate-pulse'}`} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-amber-500 text-center">SKU NO IDENTIFICADO</h2>
                        </div>
                        <div className="font-mono text-3xl font-bold mb-10 bg-black/40 py-4 px-6 rounded-2xl text-white text-center border border-white/5 tracking-[0.2em]">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xl py-6 rounded-[1.5rem] shadow-[0_10px_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all uppercase tracking-widest">Registrar como Pendiente</button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        {/* Status Badges for Verified Mode */}
                        {expectedItem && (
                            <div className="flex gap-2 mb-6 animate-in slide-in-from-top-4">
                                {isOverCount ? (
                                    <div className="bg-red-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-bounce">
                                        <AlertTriangle className="w-4 h-4" /> Alerta de Exceso
                                    </div>
                                ) : isTargetReached ? (
                                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                        <CheckCircle2 className="w-4 h-4" /> Objetivo Logrado
                                    </div>
                                ) : (
                                    <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest backdrop-blur-md">
                                        Esperado: {targetQty} Unid.
                                    </div>
                                )}
                            </div>
                        )}

                        <h1 className={`text-4xl md:text-7xl font-black leading-none mb-6 text-white text-center break-words line-clamp-2 tracking-tighter ${lowPerf ? '' : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]'}`}>
                            {activeProductStats.name}
                        </h1>
                        
                        <div className="flex flex-wrap justify-center items-center gap-3 mb-10">
                            <div className="bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-2xl font-mono text-sm md:text-lg text-blue-400 font-bold border border-blue-500/20 shadow-lg">
                                {lastScan.barcode}
                            </div>
                            <button 
                                onClick={(e) => onToggleIncident(e, lastScan.id, isLastScanIncident)}
                                className={`px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 transition-all active:scale-95 border uppercase tracking-widest ${isLastScanIncident ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-slate-900/40 text-slate-500 border-white/5 hover:bg-slate-800'}`}
                            >
                                <AlertTriangle className="w-5 h-5" />
                                {isLastScanIncident ? 'Incidencia FRC' : 'Marcar FRC'}
                            </button>
                        </div>

                        {/* Progress Bar for Verified Mode */}
                        {expectedItem && (
                            <div className="w-full max-w-md h-4 bg-slate-900 border border-white/10 rounded-full overflow-hidden mb-12 relative shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-700 rounded-full ${isOverCount ? 'bg-red-500' : (isTargetReached ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]')}`}
                                    style={{ width: `${progress}%` }}
                                />
                                {isOverCount && <div className="absolute inset-0 bg-red-500 animate-pulse opacity-10"></div>}
                            </div>
                        )}

                        <div className="flex flex-col items-center">
                            <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-blue-400/50 mb-4 bg-blue-500/5 px-4 py-1.5 rounded-full border border-blue-500/10">
                                {expectedItem ? 'Cantidad Acumulada' : 'Total Procesado'}
                            </div>
                            <div className={`text-[9rem] md:text-[14rem] leading-none font-black tracking-tighter text-white font-mono flex items-baseline select-none ${lowPerf ? '' : 'text-neon'}`}>
                                {currentQty}
                                {expectedItem && (
                                    <span className="text-3xl md:text-5xl text-white/20 ml-4 font-bold tracking-normal">
                                        / {targetQty}
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
        <div className="flex flex-col items-center opacity-10 animate-pulse">
            <Zap className="w-32 h-32 mb-8 text-blue-400" />
            <h2 className="text-4xl font-black tracking-[0.4em] uppercase text-blue-400">En Espera</h2>
            <p className="mt-4 text-xs font-mono uppercase tracking-widest">Escanee etiqueta logística para comenzar</p>
        </div>
    );
});