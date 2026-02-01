
import React from 'react';
import { Container, CheckCircle2 } from 'lucide-react';

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
    isEcoMode
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative min-h-0">
            
            {/* INDICADOR DE ÚLTIMA LECTURA */}
            <div className="h-24 flex flex-col items-center justify-center mb-8 w-full">
                {lastAction?.type === 'success' ? (
                    <div className="text-center animate-in zoom-in duration-300 w-full">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 px-4 py-1.5 rounded-full mb-3">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.2em]">Registrado</span>
                        </div>
                        <div className={`font-mono font-black tracking-widest truncate w-full px-4 ${isEcoMode ? 'text-4xl text-white' : 'text-3xl text-white'}`}>
                            {lastAction.label}
                        </div>
                    </div>
                ) : (
                    <div className="opacity-20 flex flex-col items-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-2">Estado</span>
                        <span className="text-lg font-bold text-white uppercase tracking-widest">Esperando...</span>
                    </div>
                )}
            </div>

            {/* CONTADOR DE PRODUCCIÓN */}
            <div className="relative mb-8">
                {!isEcoMode && (
                    <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full animate-pulse-slow"></div>
                )}
                
                <div className="relative flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-6">
                        <Container className={`w-12 h-12 md:w-16 md:h-16 ${isEcoMode ? 'text-white/10' : 'text-blue-500'}`} />
                        <span className="text-[10rem] md:text-[14rem] font-black tracking-tighter tabular-nums leading-none text-white drop-shadow-2xl">
                            {draftCount}
                        </span>
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.6em] mt-4 ${isEcoMode ? 'text-white/20' : 'text-blue-400'}`}>Bultos Sesión</div>
                </div>
            </div>
        </div>
    );
};
