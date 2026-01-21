
import React, { memo } from 'react';
import { Camera, Keyboard, X, Minus, Plus } from 'lucide-react';
import { CountingSession } from '../types';

interface ScannerControlsProps {
    session: CountingSession;
    sessionStats: { totalQty: number; uniqueSkus: number };
    multiplier: number;
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
    return (
        <div className="w-full bg-black border-t-8 border-white/10 pb-safe-area p-2">
            <div className="max-w-4xl mx-auto grid grid-cols-12 gap-2 h-20">
                
                {/* STATS AREA */}
                <div className="col-span-4 bg-[#111] border-2 border-white/10 flex items-center justify-around px-2">
                    <div className="text-center">
                        <span className="text-[8px] font-black text-white/30 block uppercase">Units</span>
                        <span className="text-2xl font-black text-white tabular-nums">{sessionStats.totalQty}</span>
                    </div>
                    <div className="w-px h-10 bg-white/5"></div>
                    <div className="text-center">
                        <span className="text-[8px] font-black text-white/30 block uppercase">SKU</span>
                        <span className="text-2xl font-black text-blue-500 tabular-nums">{sessionStats.uniqueSkus}</span>
                    </div>
                </div>

                {/* MULTIPLIER BUTTON */}
                <button 
                    onClick={onMultiplierClick}
                    className={`col-span-4 h-full font-black text-3xl flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                        multiplier > 1 ? 'bg-amber-500 text-black' : 'bg-[#222] text-white border-2 border-white/10'
                    }`}
                >
                    <span className="text-xs opacity-50 uppercase">x</span>{multiplier}
                </button>

                {/* TOOLS AREA */}
                <div className="col-span-4 flex gap-2">
                    <button 
                        onClick={onCameraClick}
                        className="flex-1 bg-[#222] border-2 border-white/10 text-blue-500 flex items-center justify-center active:bg-blue-600 active:text-white"
                    >
                        <Camera className="w-7 h-7" />
                    </button>
                    <button 
                        onClick={onManualClick}
                        className="flex-1 bg-[#222] border-2 border-white/10 text-white flex items-center justify-center active:bg-white active:text-black"
                    >
                        <Keyboard className="w-7 h-7" />
                    </button>
                </div>

            </div>
        </div>
    );
});
