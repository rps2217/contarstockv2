
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
        <header className="h-14 px-4 flex justify-between items-center z-20 shrink-0 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 opacity-80">
                <div className="bg-white/10 p-1.5 rounded-lg"><Package className="w-4 h-4" /></div>
                <div className="font-mono font-bold text-sm tracking-widest">{erpOrder}</div>
            </div>
            <div className="flex items-center gap-2">
                {showSpeedometer && (
                    <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${scansPerMinute > 20 ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-white/10 border-white/10 text-slate-300'}`}>
                        <Gauge className="w-3 h-3" />
                        <span>{scansPerMinute} ipm</span>
                    </div>
                )}

                <button 
                    onClick={onPause} 
                    className="bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all backdrop-blur-md"
                >
                    <Pause className="w-3 h-3" /> <span className="hidden md:inline">Pausar</span>
                </button>
            </div>
        </header>
    );
});
