
import React, { memo } from 'react';
import { Package, Pause, RotateCcw, Box } from 'lucide-react';

interface ScannerHeaderProps {
    erpOrder: string;
    scansPerMinute: number;
    showSpeedometer: boolean;
    onPause: () => void;
    onUndo: () => void;
    canUndo: boolean;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = memo(({ erpOrder, onPause, onUndo, canUndo }) => {
    return (
        <header className="h-16 px-6 flex justify-between items-center z-20 shrink-0 bg-white border-b border-slate-100">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100 shadow-sm"><Box className="w-5 h-5" /></div>
                <div className="font-mono font-black text-xl tracking-widest text-slate-800">{erpOrder}</div>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${canUndo ? 'text-amber-600 hover:bg-amber-50 active:scale-90' : 'text-slate-200'}`}
                    title="Deshacer"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>

                <button 
                    onClick={onPause} 
                    className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-md"
                >
                    <Pause className="w-5 h-5 fill-white" />
                </button>
            </div>
        </header>
    );
});
