
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
    onMultiplierClick: (val: number) => void;
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

    const quickQuantities = [1, 5, 10, 20];

    return (
        <div className="shrink-0 pb-safe-area px-4 pb-8 relative z-40">
            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-4 flex flex-col gap-4 shadow-2xl shadow-slate-200/50">
                
                {/* BARRA DE MULTIPLICADORES RÁPIDOS */}
                <div className="grid grid-cols-4 gap-2">
                    {quickQuantities.map(qty => (
                        <button
                            key={qty}
                            onClick={() => onMultiplierClick(qty)}
                            className={`h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all active:scale-90 border-2 ${multiplier === qty ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                        >
                            +{qty}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between items-center bg-slate-900 rounded-[1.8rem] p-3">
                    <div className="flex gap-6 px-4 items-center">
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">Unidades</span>
                            <span className="text-2xl font-black tabular-nums text-white">{sessionStats.totalQty}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">SKUs</span>
                            <span className="text-2xl font-black tabular-nums text-blue-400 flex items-baseline">
                                {sessionStats.uniqueSkus}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={onCameraClick}
                            className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center active:scale-90 transition-all ${
                                hasCameraSupport 
                                ? 'bg-white/5 text-blue-400 border-white/10 hover:bg-white/10' 
                                : 'bg-red-900/20 text-red-500 border-red-500/20 opacity-50'
                            }`}
                        >
                            <Camera className="w-7 h-7" />
                        </button>
                        
                        <button 
                            onClick={onManualClick}
                            className="h-14 w-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-xl active:scale-90 transition-all"
                        >
                            <Keyboard className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
