
import React, { memo } from 'react';
import { Lock, Coffee, CheckCircle, AlertTriangle } from 'lucide-react';

interface ScannerFeedbackLayerProps {
    feedback: 'idle' | 'success' | 'error' | 'undo';
    isIncident?: boolean;
    isWindowFocused?: boolean;
    isIdle?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isIncident, isWindowFocused = true, isIdle = false }) => {
    
    if (!isWindowFocused) {
        return (
            <div className="absolute inset-0 z-[100] bg-slate-950/90 flex flex-col items-center justify-center text-center p-8 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="bg-blue-500/10 p-8 rounded-full mb-6 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                    <Lock className="w-12 h-12 text-blue-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Pausado</h2>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Toca para reanudar motor</p>
            </div>
        );
    }

    if (isIdle) {
        return (
            <div className="absolute inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center animate-in fade-in duration-1000">
                <div className="text-slate-800 text-[12rem] font-black tracking-tighter select-none opacity-20">ZZZ</div>
            </div>
        );
    }

    return (
        <>
            {/* Capa de Pulso Visual (Success/Error) */}
            {feedback === 'success' && <div className="scan-success-glow" />}
            {feedback === 'error' && (
                <div className="absolute inset-0 z-[5] bg-rose-500/10 animate-pulse pointer-events-none border-4 border-rose-500/50" />
            )}
            
            {/* Decoración de Fondo (Grid Tecnológico) */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </>
    );
});
