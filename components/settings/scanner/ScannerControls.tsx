import React, { memo, useMemo } from 'react';
import { Gauge, Camera, Ban, Keyboard, PieChart } from 'lucide-react';
import { CountingSession } from '../../../types';

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
        <div className="shrink-0 pb-safe-area px-4 pb-8 relative z-40">
            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[2rem] p-3 flex flex-col gap-3 shadow-2xl shadow-slate-200/50">
                
                {globalProgress !== null && (
                    <div className="px-5 pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                <PieChart className="w-3.5 h-3.5" /> Eficiencia de Bulto
                            </div>
                            <div className="text-[10px] font-black text-slate-900 bg-indigo-50 px-2 py-0.5 rounded-lg">{globalProgress.toFixed(1)}%</div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                            <div 
                                className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                                style={{ width: `${globalProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <div className="flex gap-6 px-5 items-center">
                        {showSpeedometer && (
                            <div className="md:hidden flex flex-col items-center justify-center mr-2 w-12 border-r border-slate-100">
                                <Gauge className={`w-6 h-6 mb-1 ${scansPerMinute > 25 ? 'text-emerald-500' : 'text-slate-300'}`} />
                                <span className={`text-[10px] font-black ${scansPerMinute > 25 ? 'text-emerald-600' : 'text-slate-400'}`}>{scansPerMinute} ipm</span>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Unidades</span>
                            <span className="text-2xl font-black tabular-nums text-slate-900">{sessionStats.totalQty}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">SKUs</span>
                            <span className="text-2xl font-black tabular-nums text-blue-600 flex items-baseline">
                                {sessionStats.uniqueSkus}
                                {session.isVerifiedMode && session.expectedItems && (
                                    <span className="text-sm text-slate-300 ml-1 font-bold">/ {session.expectedItems.length}</span>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onCameraClick}
                            className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center shadow-lg active:scale-90 transition-all ${
                                hasCameraSupport 
                                ? 'bg-slate-50 text-blue-600 border-blue-100 hover:bg-blue-50' 
                                : 'bg-red-50 text-red-400 border-red-100 opacity-50'
                            }`}
                        >
                            {hasCameraSupport ? <Camera className="w-7 h-7" /> : <Ban className="w-7 h-7" />}
                        </button>

                        <button 
                            onClick={onMultiplierClick}
                            className={`h-14 px-6 rounded-2xl font-black text-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${multiplier > 1 ? 'bg-amber-400 text-amber-950 shadow-amber-100' : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:bg-slate-200'}`}
                        >
                            <span className="text-xs mr-1 opacity-50 font-bold">x</span>{multiplier}
                        </button>
                        
                        <button 
                            onClick={onManualClick}
                            className="h-14 w-14 rounded-2xl bg-slate-900 hover:bg-black text-white flex items-center justify-center shadow-xl active:scale-90 transition-all"
                        >
                            <Keyboard className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});