
import React from 'react';
import { Container, Zap, Keyboard, Camera } from 'lucide-react';

interface Props {
    lastAction: { type: 'success' | 'duplicate', label: string } | null;
    draftCount: number;
    isEcoMode: boolean;
    onToggleManual: () => void;
    onCameraClick: () => void;
}

export const ReceptionHero: React.FC<Props> = ({ 
    lastAction, 
    draftCount, 
    isEcoMode, 
    onToggleManual, 
    onCameraClick 
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            
            {/* INDICADOR DE ÚLTIMA LECTURA (FLOTANTE) */}
            <div className="h-32 flex flex-col items-center justify-center mb-4">
                {lastAction?.type === 'success' && (
                    <div className="text-center animate-in slide-in-from-bottom-4 duration-300">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2">Lectura Confirmada</div>
                        <div className={`font-mono font-black tracking-[0.2em] ${isEcoMode ? 'text-4xl text-white' : 'text-3xl text-white/90'}`}>
                            {lastAction.label}
                        </div>
                    </div>
                )}
                {(!lastAction && isEcoMode) && (
                    <div className="flex flex-col items-center opacity-20">
                        <Zap className="w-8 h-8 text-white mb-2 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Esperando Escaneo...</span>
                    </div>
                )}
            </div>

            {/* CONTADOR DE PRODUCCIÓN (EL CORAZÓN DE LA UI) */}
            <div className="relative mb-12">
                {!isEcoMode && <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full"></div>}
                
                <div className={`relative flex flex-col items-center justify-center transition-all duration-500 ${isEcoMode ? 'scale-110' : ''}`}>
                    <div className={`text-[10px] font-black uppercase tracking-[0.5em] mb-6 ${isEcoMode ? 'text-white/20' : 'text-white/40'}`}>Bultos Sesión</div>
                    <div className="flex items-center justify-center gap-8">
                        <Container className={`w-16 h-16 ${isEcoMode ? 'text-white/5' : 'text-blue-500/20'}`} />
                        <span className={`text-[12rem] md:text-[16rem] font-black tracking-tighter tabular-nums leading-none ${isEcoMode ? 'text-white/80' : 'text-white'} drop-shadow-2xl`}>
                            {draftCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* CONTROLES SECUNDARIOS */}
            <div className={`grid grid-cols-2 gap-4 w-full max-w-sm transition-opacity duration-500 ${isEcoMode ? 'opacity-10 pointer-events-none' : 'opacity-100'}`}>
                <button onClick={onToggleManual} className="bg-white/5 hover:bg-white/10 border-2 border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all active:scale-95">
                    <Keyboard className="w-8 h-8 text-white/30" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Manual</span>
                </button>
                <button onClick={onCameraClick} className="bg-white/5 hover:bg-white/10 border-2 border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all active:scale-95">
                    <Camera className="w-8 h-8 text-white/30" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Cámara</span>
                </button>
            </div>
            
            {/* FOOTER HID */}
            <div className="mt-auto pb-8 text-center">
                <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border ${isEcoMode ? 'bg-white/5 border-white/5 text-white/20' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isEcoMode ? 'bg-white/20' : 'bg-blue-500'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Puerto HID: Activo</span>
                </div>
            </div>
        </div>
    );
};
