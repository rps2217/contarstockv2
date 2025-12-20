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
        <div className="flex flex-col items-center justify-center min-h-full pb-20 animate-in fade-in duration-500">
            {props.lastScanned ? (
                <div className="mb-10 animate-in zoom-in slide-in-from-bottom-6 duration-300 text-center">
                    <div className="bg-emerald-100 text-emerald-700 border-2 border-emerald-200 px-8 py-3 rounded-full font-black uppercase tracking-widest mb-6 inline-flex items-center gap-3 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" /> Registrado con Éxito
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter break-all drop-shadow-sm">{props.lastScanned}</h1>
                    <p className="text-slate-400 mt-4 font-black uppercase tracking-[0.3em] text-xs">Preparado para nuevo escaneo</p>
                </div>
            ) : (
                <div className="mb-10 opacity-30 text-center">
                    <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><Zap className="w-12 h-12" /></div>
                    <h2 className="text-3xl font-black uppercase tracking-widest text-slate-900">Modo Recepción</h2>
                    <p className="text-sm text-slate-500 mt-3 font-semibold uppercase tracking-wider">Escanee etiquetas de bultos sin interrupciones</p>
                </div>
            )}

            <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm border-2 border-slate-100 relative overflow-hidden group mb-12 shadow-2xl shadow-slate-200/50">
                <div className="absolute top-0 right-0 p-24 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                <div className="absolute top-6 right-6 z-20">
                    <button onClick={props.onShowList} className="p-3 bg-slate-50 hover:bg-blue-600 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-black border border-slate-100 shadow-sm">
                        <List className="w-5 h-5" /> <span className="hidden sm:inline">Listado</span>
                    </button>
                </div>
                <div className="relative z-10 text-center mt-4">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 ml-1">Ingresos en Cola</div>
                    <div className="text-9xl font-black text-slate-900 flex items-center justify-center gap-4">
                        <Box className="w-14 h-14 text-blue-200" />
                        {props.draftCount}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-sm">
                {!props.showManualInput && (
                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={props.onToggleManual} className="bg-white hover:bg-slate-50 text-slate-900 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-4 border-2 border-slate-100 shadow-xl shadow-slate-200/40 transition-all active:scale-95 group">
                            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors"><Keyboard className="w-7 h-7 text-slate-400" /></div> Teclado
                        </button>
                        <button onClick={props.onCameraClick} className={`py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-4 border-2 shadow-xl transition-all active:scale-95 group ${props.hasCameraSupport ? 'bg-white text-slate-900 border-slate-100 hover:bg-slate-50 shadow-slate-200/40' : 'bg-slate-50 text-slate-300 border-slate-50 opacity-40'}`}>
                            <div className={`p-3 rounded-2xl transition-colors ${props.hasCameraSupport ? 'bg-blue-50 group-hover:bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-300'}`}>
                                {props.hasCameraSupport ? <Camera className="w-7 h-7" /> : <Ban className="w-7 h-7" />}
                            </div> Cámara
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};