
import React, { memo } from 'react';
import { Package, Pause, RotateCcw, Box, MapPin, Lock } from 'lucide-react';

interface ScannerHeaderProps {
    erpOrder: string;
    location: string;
    onLocationClick: () => void;
    onPause: () => void;
    onUndo: () => void;
    onLock: () => void;
    canUndo: boolean;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = memo(({ erpOrder, location, onLocationClick, onPause, onUndo, onLock, canUndo }) => {
    return (
        <header className="h-16 px-6 flex justify-between items-center z-20 shrink-0 bg-white border-b border-slate-100">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100 shadow-sm"><Box className="w-5 h-5" /></div>
                <div className="font-mono font-black text-lg tracking-widest text-slate-800">{erpOrder}</div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={onLocationClick}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group mr-2"
                >
                    <MapPin className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[100px]">{location}</span>
                </button>

                <button 
                    onClick={onLock}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-90 transition-all"
                    title="Bloquear Pantalla"
                >
                    <Lock className="w-5 h-5" />
                </button>

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
                    className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-md ml-1"
                >
                    <Pause className="w-5 h-5 fill-white" />
                </button>
            </div>
        </header>
    );
});
