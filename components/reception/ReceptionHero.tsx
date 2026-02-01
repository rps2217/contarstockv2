
import React, { memo } from 'react';
import { Container, CheckCircle2, AlertTriangle, Box } from 'lucide-react';

interface Props {
    lastAction: { type: 'success' | 'duplicate', label: string } | null;
    draftCount: number;
    isEcoMode: boolean;
    onToggleManual: () => void;
    onCameraClick: () => void;
}

export const ReceptionHero: React.FC<Props> = memo(({ 
    lastAction, 
    draftCount, 
    isEcoMode
}) => {
    return (
        <div className="h-[30vh] shrink-0 flex flex-col items-center justify-center p-4 relative border-b-4 border-black bg-slate-950 transition-colors duration-300 overflow-hidden">
            
            {/* Efecto de Fondo */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>

            {/* Indicador de Estado / Último Scan */}
            <div className="h-16 w-full flex items-center justify-center relative z-10 mb-2">
                {lastAction ? (
                    <div className={`flex flex-col items-center w-full animate-in zoom-in duration-200`}>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-1 border ${lastAction.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                            {lastAction.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            <span className="text-[9px] font-black uppercase tracking-widest">{lastAction.type === 'success' ? 'REGISTRADO' : 'DUPLICADO'}</span>
                        </div>
                        <span className="font-mono font-black text-xl md:text-2xl text-white tracking-widest truncate max-w-full px-4">
                            {lastAction.label}
                        </span>
                    </div>
                ) : (
                    <div className="opacity-20 flex flex-col items-center">
                        <Box className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">ESPERANDO_INPUT</span>
                    </div>
                )}
            </div>

            {/* Contador Gigante (Estilo Massive) */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1">
                <div className="flex items-center justify-center gap-4">
                    <div className="text-[7rem] md:text-[9rem] font-black tabular-nums leading-none text-white drop-shadow-2xl tracking-tighter">
                        {draftCount}
                    </div>
                </div>
                <div className="absolute -bottom-2 bg-slate-900/80 px-4 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">BULTOS EN COLA</span>
                </div>
            </div>
        </div>
    );
});
