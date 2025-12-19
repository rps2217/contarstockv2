
import React from 'react';
import { CheckCircle2, Zap, Box, Keyboard, Camera, Ban, List } from 'lucide-react';

interface Props {
    lastScanned: string | null;
    draftCount: number;
    showManualInput: boolean;
    hasCameraSupport: boolean;
    onToggleManual: () => void;
    onCameraClick: () => void;
    onShowList: () => void;
}

export const ReceptionHero: React.FC<Props> = (props) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full pb-12 animate-in fade-in duration-500">
            {props.lastScanned ? (
                <div className="mb-8 animate-in zoom-in slide-in-from-bottom-4 duration-300 text-center">
                    <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-6 py-2 rounded-full font-bold uppercase tracking-wider mb-4 inline-flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Registrado
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter break-all">{props.lastScanned}</h1>
                    <p className="text-slate-500 mt-2 font-mono uppercase tracking-widest text-[10px]">Listo para el siguiente bulto</p>
                </div>
            ) : (
                <div className="mb-8 opacity-50 text-center">
                    <Zap className="w-20 h-20 mx-auto mb-4 text-blue-400" />
                    <h2 className="text-2xl font-black uppercase tracking-widest">Modo Ráfaga</h2>
                    <p className="text-xs text-slate-500 mt-2 uppercase">Escanee bultos rápidamente</p>
                </div>
            )}

            <div className="bg-white/5 rounded-[2.5rem] p-8 w-full max-w-sm border border-white/10 relative overflow-hidden group mb-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-20 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={props.onShowList} className="p-2.5 bg-white/10 hover:bg-blue-600 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-bold border border-white/5">
                        <List className="w-4 h-4" /> <span className="hidden sm:inline">Ver Lista</span>
                    </button>
                </div>
                <div className="relative z-10 text-center">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 ml-1">Total Ingresos</div>
                    <div className="text-8xl font-black text-white flex items-center justify-center gap-3">
                        <Box className="w-12 h-12 text-slate-700" />
                        {props.draftCount}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-sm">
                {!props.showManualInput && (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={props.onToggleManual} className="bg-slate-800 hover:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3 border border-slate-700 shadow-xl transition-all active:scale-95">
                            <Keyboard className="w-6 h-6 text-slate-400" /> Teclado
                        </button>
                        <button onClick={props.onCameraClick} className={`py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3 border shadow-xl transition-all active:scale-95 ${props.hasCameraSupport ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' : 'bg-red-900/10 text-red-500 border-red-900/30 opacity-50'}`}>
                            {props.hasCameraSupport ? <Camera className="w-6 h-6" /> : <Ban className="w-6 h-6" />} Cámara
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
