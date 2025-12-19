
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
        const currentQty = activeProductStats.totalQty;
        const targetQty = expectedItem?.expectedQty || 0;
        
        const isOverCount = expectedItem && currentQty > targetQty;
        const isTargetReached = expectedItem && currentQty === targetQty;
        const progress = targetQty > 0 ? Math.min(100, (currentQty / targetQty) * 100) : 0;

        return (
            <div className={`animate-in zoom-in-95 duration-100 w-full max-w-2xl flex flex-col items-center transition-colors ${isOverCount ? 'bg-red-950/20 rounded-3xl p-4 md:p-8' : ''}`}>
                {isUnknown ? (
                    <div className="bg-amber-500/90 text-black p-8 rounded-3xl shadow-2xl border-4 border-amber-300 w-full">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <AlertTriangle className={`w-20 h-20 ${lowPerf ? '' : 'animate-pulse'}`} />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Producto Desconocido</h2>
                        </div>
                        <div className="font-mono text-3xl font-bold mb-8 bg-black/10 py-2 rounded-xl">{lastScan.barcode}</div>
                        <button onClick={onRegisterPending} className="w-full bg-black text-amber-500 hover:bg-slate-900 font-black text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-all">REGISTRAR COMO PENDIENTE</button>
                    </div>
                ) : (
                    <>
                        {/* Status Badges for Verified Mode */}
                        {expectedItem && (
                            <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
                                {isOverCount && (
                                    <div className="bg-red-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg animate-bounce">
                                        <AlertTriangle className="w-4 h-4" /> ¡Exceso Detectado!
                                    </div>
                                )}
                                {isTargetReached && (
                                    <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                                        <CheckCircle2 className="w-4 h-4" /> Cantidad Completada
                                    </div>
                                )}
                                {!isOverCount && !isTargetReached && (
                                    <div className="bg-blue-600/30 text-blue-200 border border-blue-500/30 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                                        Esperado: {targetQty} Unid.
                                    </div>
                                )}
                            </div>
                        )}

                        <h1 className={`text-3xl md:text-5xl font-black leading-tight mb-4 text-white text-center break-words line-clamp-3 ${lowPerf ? '' : 'drop-shadow-md'}`}>
                            {activeProductStats.name}
                        </h1>
                        
                        <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
                            <div className="bg-white/10 px-4 py-2 rounded-xl font-mono text-sm md:text-base text-white/80 border border-white/5">
                                {lastScan.barcode}
                            </div>
                            <button 
                                onClick={(e) => onToggleIncident(e, lastScan.id, isLastScanIncident)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm md:text-base flex items-center gap-2 transition-all active:scale-95 border border-white/10 ${isLastScanIncident ? 'bg-white text-amber-700 shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                            >
                                <AlertTriangle className={`w-5 h-5 ${isLastScanIncident ? 'fill-amber-700' : ''}`} />
                                {isLastScanIncident ? 'CON INCIDENCIA' : 'MARCAR FRC'}
                            </button>
                        </div>

                        {/* Progress Bar for Verified Mode */}
                        {expectedItem && (
                            <div className="w-full max-w-sm h-3 bg-white/10 rounded-full overflow-hidden mb-8 border border-white/5 relative">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${isOverCount ? 'bg-red-500' : (isTargetReached ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]')}`}
                                    style={{ width: `${progress}%` }}
                                />
                                {isOverCount && <div className="absolute inset-0 bg-red-500 animate-pulse opacity-20"></div>}
                            </div>
                        )}

                        <div className="flex flex-col items-center">
                            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50 mb-1">
                                {expectedItem ? 'Cantidad Acumulada' : 'Total Acumulado'}
                            </div>
                            <div className={`text-[7rem] md:text-[9rem] leading-none font-black tracking-tighter text-white font-mono flex items-baseline ${lowPerf ? '' : 'drop-shadow-2xl'}`}>
                                {currentQty}
                                {expectedItem && (
                                    <span className="text-2xl md:text-4xl text-white/30 ml-2 font-bold tracking-normal">
                                        / {targetQty}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center opacity-20">
            <Zap className="w-32 h-32 mb-6" />
            <h2 className="text-4xl font-black tracking-widest uppercase">Listo</h2>
            <p className="mt-2 text-sm font-mono">Esperando Escáner...</p>
        </div>
    );
});
