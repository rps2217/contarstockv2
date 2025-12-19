
import React, { memo, useMemo } from 'react';
import { Gauge, Camera, Ban, Keyboard, PieChart } from 'lucide-react';
import { CountingSession } from '../../types';

interface ScannerControlsProps {
    session: CountingSession;
    sessionStats: { totalQty: number; uniqueSkus: number };
    multiplier: number;
    scansPerMinute: number;
    showSpeedometer: boolean;
    hasCameraSupport: boolean;
    onCameraClick: () => void;
    onMultiplierClick: () => void;
    onManualClick: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = memo(({ 
    session,
    sessionStats, 
    multiplier, 
    scansPerMinute, 
    showSpeedometer, 
    hasCameraSupport,
    onCameraClick, 
    onMultiplierClick, 
    onManualClick 
}) => {
    const globalProgress = useMemo(() => {
        if (!session.isVerifiedMode || !session.expectedItems) return null;
        const totalExpected = session.expectedItems.reduce((acc, i) => acc + i.expectedQty, 0);
        if (totalExpected === 0) return 0;
        return Math.min(100, (sessionStats.totalQty / totalExpected) * 100);
    }, [session.isVerifiedMode, session.expectedItems, sessionStats.totalQty]);

    return (
        <div className="shrink-0 pb-safe-area px-4 pb-4 relative z-40">
            <div className="max-w-md mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-lg">
                
                {/* Global Progress Bar for Verified Mode */}
                {globalProgress !== null && (
                    <div className="px-3 pt-2">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                <PieChart className="w-3 h-3" /> Progreso Guía
                            </div>
                            <div className="text-[9px] font-black text-white">{globalProgress.toFixed(1)}%</div>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-1000"
                                style={{ width: `${globalProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    {/* Stats */}
                    <div className="flex gap-4 px-3 items-center">
                        {showSpeedometer && (
                            <div className="md:hidden flex flex-col items-center justify-center mr-2 w-10">
                                <Gauge className={`w-5 h-5 ${scansPerMinute > 20 ? 'text-green-400' : 'text-slate-500'}`} />
                                <span className={`text-[9px] font-bold ${scansPerMinute > 20 ? 'text-green-400' : 'text-slate-500'}`}>{scansPerMinute}</span>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-white/40">Unidades</span>
                            <span className="text-xl font-bold tabular-nums">{sessionStats.totalQty}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-white/40">SKUs</span>
                            <span className="text-xl font-bold tabular-nums text-blue-400">
                                {sessionStats.uniqueSkus}
                                {session.isVerifiedMode && session.expectedItems && (
                                    <span className="text-xs text-white/20 ml-1">/ {session.expectedItems.length}</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                        <button 
                            onClick={onCameraClick}
                            className={`h-12 w-12 rounded-xl border flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                                hasCameraSupport 
                                ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' 
                                : 'bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900'
                            }`}
                        >
                            {hasCameraSupport ? <Camera className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
                        </button>

                        <button 
                            onClick={onMultiplierClick}
                            className={`h-12 px-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${multiplier > 1 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            <span className="text-xs mr-1 opacity-60">x</span>{multiplier}
                        </button>
                        
                        <button 
                            onClick={onManualClick}
                            className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
                        >
                            <Keyboard className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
