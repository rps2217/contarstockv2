
import React, { memo, useState } from 'react';
import { Camera, Keyboard, MoreHorizontal, X, ChevronUp, ChevronDown } from 'lucide-react';
import { CountingSession } from '../types';

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
    sessionStats, 
    multiplier, 
    onCameraClick, 
    onMultiplierClick, 
    onManualClick 
}) => {
    const [showTools, setShowTools] = useState(false);

    return (
        <div className="w-full relative z-50 px-4 pb-6 md:pb-8">
            {/* SECONDARY TOOLS TRAY (Mobile Only Overlay) */}
            {showTools && (
                <div className="absolute bottom-full left-0 right-0 px-6 pb-4 animate-in slide-in-from-bottom-4 duration-200 md:hidden">
                    <div className="bg-slate-900 text-white rounded-3xl p-2 shadow-2xl flex items-center justify-around border border-white/10 backdrop-blur-xl">
                        <button 
                            onClick={() => { onCameraClick(); setShowTools(false); }}
                            className="flex flex-col items-center gap-1 p-4 active:scale-90 transition-all"
                        >
                            <div className="bg-white/10 p-3 rounded-2xl"><Camera className="w-6 h-6 text-blue-400" /></div>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Cámara</span>
                        </button>
                        
                        <div className="w-px h-12 bg-white/5"></div>

                        <button 
                            onClick={() => { onManualClick(); setShowTools(false); }}
                            className="flex flex-col items-center gap-1 p-4 active:scale-90 transition-all"
                        >
                            <div className="bg-white/10 p-3 rounded-2xl"><Keyboard className="w-6 h-6 text-white" /></div>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Manual</span>
                        </button>
                        
                        <div className="w-px h-12 bg-white/5"></div>

                        <button 
                            onClick={() => setShowTools(false)}
                            className="p-4 active:scale-90 transition-all text-rose-400"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN CONTROL BAR */}
            <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200/80 rounded-[2.5rem] shadow-[0_15px_50px_-12px_rgba(0,0,0,0.12)] flex items-center justify-between p-3 gap-2">
                
                {/* COMPACT STATS */}
                <div className="flex items-center gap-4 px-4 bg-slate-50/50 rounded-[1.8rem] py-2 border border-slate-100/50">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">U.</span>
                        <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">{sessionStats.totalQty}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SKU</span>
                        <span className="text-2xl font-black text-blue-600 tabular-nums leading-none">{sessionStats.uniqueSkus}</span>
                    </div>
                </div>

                {/* PROMINENT MULTIPLIER (Primary Action) */}
                <button 
                    onClick={onMultiplierClick}
                    className={`flex-1 h-16 rounded-[1.8rem] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                        multiplier > 1 
                        ? 'bg-amber-400 border-2 border-amber-500 text-amber-950 shadow-amber-200/40' 
                        : 'bg-slate-900 text-white shadow-slate-900/10'
                    }`}
                >
                    <span className={`text-xs font-bold uppercase tracking-tighter transition-opacity ${multiplier > 1 ? 'opacity-60' : 'opacity-30'}`}>Mult.</span>
                    <span className="text-3xl font-black tabular-nums">x{multiplier}</span>
                </button>

                {/* DESKTOP TOOLBOX (Visible on md+) */}
                <div className="hidden md:flex items-center gap-2 pr-1">
                    <button 
                        onClick={onCameraClick}
                        className="w-14 h-14 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all hover:bg-blue-100"
                    >
                        <Camera className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={onManualClick}
                        className="w-14 h-14 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center active:scale-90 transition-all hover:bg-slate-200"
                    >
                        <Keyboard className="w-6 h-6" />
                    </button>
                </div>

                {/* MOBILE TOOLBOX TRIGGER (Visible on <md) */}
                <button 
                    onClick={() => setShowTools(!showTools)}
                    className={`md:hidden w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all active:scale-90 shadow-sm border ${
                        showTools ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                >
                    {showTools ? <X className="w-7 h-7" /> : <MoreHorizontal className="w-7 h-7" />}
                </button>
            </div>
        </div>
    );
});
