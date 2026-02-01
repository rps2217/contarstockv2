
import React, { memo } from 'react';
import { ChevronLeft, MapPin, Barcode, RotateCcw, Download, Save, Lock } from 'lucide-react';

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
    onLock: () => void;
}

export const MassiveHeader: React.FC<Props> = memo(({ 
    location, hasActiveItem, isMigrating, hasItems, 
    onBack, onChangeLocation, onShowLabel, onReset, onImport, onFinalize, onLock 
}) => {
    return (
        <header className="h-16 px-3 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
            {/* LADO IZQUIERDO: Navegación y Ubicación */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={onBack} 
                    className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors border border-white/5"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                
                <button 
                    onClick={onChangeLocation}
                    className="flex flex-col items-start px-3 py-1 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group max-w-[100px]"
                >
                    <div className="flex items-center gap-1 opacity-40">
                        <MapPin className="w-2.5 h-2.5 text-blue-400" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-white">Ubicación</span>
                    </div>
                    <span className="text-[10px] font-black uppercase truncate w-full text-blue-400 tracking-tight">
                        {location}
                    </span>
                </button>
            </div>
            
            {/* LADO DERECHO: Acciones */}
            <div className="flex items-center gap-1.5">
                {/* Bloqueo */}
                <button 
                    onClick={onLock}
                    className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/5 active:bg-white/20 transition-all"
                    title="Bloquear"
                >
                    <Lock className="w-5 h-5 text-white/60" />
                </button>

                {/* Etiquetas */}
                <button 
                    disabled={!hasActiveItem}
                    onClick={onShowLabel}
                    className={`w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/5 active:bg-blue-600 transition-all disabled:opacity-10`}
                >
                    <Barcode className={`w-5 h-5 ${hasActiveItem ? 'text-blue-400' : 'text-white/20'}`} />
                </button>

                {/* Reset (Compacto) */}
                <button 
                    onClick={onReset} 
                    className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/5 active:bg-rose-600 transition-colors"
                >
                    <RotateCcw className="w-5 h-5 text-white/40" />
                </button>

                {/* Importar */}
                <button 
                    onClick={onImport} 
                    className="w-11 h-11 flex items-center justify-center bg-indigo-600/10 rounded-xl border border-indigo-500/20 active:bg-indigo-600 transition-colors"
                >
                    <Download className="w-5 h-5 text-indigo-400" />
                </button>

                {/* Guardar (Principal) */}
                <button 
                    onClick={onFinalize} 
                    disabled={!hasItems || isMigrating} 
                    className="ml-1 w-12 h-11 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/40 disabled:opacity-30 transition-all"
                >
                    <Save className="w-6 h-6 text-white" />
                </button>
            </div>
        </header>
    );
});
