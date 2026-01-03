
import React, { memo } from 'react';
import { Package, Pause, Gauge } from 'lucide-react';

interface ScannerHeaderProps {
    erpOrder: string;
    scansPerMinute: number;
    showSpeedometer: boolean;
    onPause: () => void;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = memo(({ erpOrder, scansPerMinute, showSpeedometer, onPause }) => {
    return (
        <header className="h-14 px-4 flex justify-between items-center z-20 shrink-0 bg-white/80 border-b border-slate-200 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><Package className="w-4 h-4" /></div>
                <div className="font-mono font-black text-sm tracking-widest text-slate-900">{erpOrder}</div>
            </div>
            <div className="flex items-center gap-2">
                {showSpeedometer && (
                    <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${scansPerMinute > 20 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <Gauge className="w-3 h-3" />
                        <span>{scansPerMinute} ipm</span>
                    </div>
                )}

                <button 
                    onClick={onPause} 
                    className="bg-slate-900 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                    <Pause className="w-3 h-3" /> <span className="hidden md:inline">Pausar</span>
                </button>
            </div>
        </header>
    );
});
