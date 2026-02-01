
import React, { memo } from 'react';
import { ChevronLeft, MapPin, Barcode, RotateCcw, Download, Save } from 'lucide-react';

interface Props {
    location: string;
    hasActiveItem: boolean;
    isMigrating: boolean;
    hasItems: boolean;
    onBack: () => void;
    onChangeLocation: () => void;
    onShowLabel: () => void;
    onReset: () => void;
    onImport: () => void;
    onFinalize: () => void;
}

export const MassiveHeader: React.FC<Props> = memo(({ 
    location, hasActiveItem, isMigrating, hasItems, 
    onBack, onChangeLocation, onShowLabel, onReset, onImport, onFinalize 
}) => {
    return (
        <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/80 shrink-0 z-50">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button 
                    onClick={onChangeLocation}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group"
                >
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[9px] font-black uppercase truncate max-w-[80px] text-white">{location}</span>
                </button>
            </div>
            
            <div className="flex gap-2">
                <button 
                    disabled={!hasActiveItem}
                    onClick={onShowLabel}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-blue-600 disabled:opacity-20 transition-all"
                >
                    <Barcode className={`w-5 h-5 ${hasActiveItem ? 'text-blue-400' : 'text-white/20'}`} />
                </button>
                <button onClick={onReset} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-rose-600 transition-colors">
                    <RotateCcw className="w-4 h-4 text-white/60" />
                </button>
                <button onClick={onImport} className="w-10 h-10 flex items-center justify-center bg-indigo-600/20 rounded-xl border border-indigo-500/20 active:bg-indigo-600 transition-colors">
                    <Download className="w-4 h-4 text-indigo-400 group-active:text-white" />
                </button>
                <button 
                    onClick={onFinalize} 
                    disabled={!hasItems || isMigrating} 
                    className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-transform"
                >
                    <Save className="w-5 h-5 text-white" />
                </button>
            </div>
        </header>
    );
});
