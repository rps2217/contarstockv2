
import React, { memo } from 'react';
import { Lock, Coffee } from 'lucide-react';

interface ScannerFeedbackLayerProps {
    feedback: 'idle' | 'success' | 'error' | 'undo';
    isIncident?: boolean;
    isWindowFocused?: boolean;
    isIdle?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isIncident, isWindowFocused = true, isIdle = false }) => {
    
    if (!isWindowFocused) {
        return (
            <div className="absolute inset-0 z-[100] bg-slate-50/80 flex flex-col items-center justify-center text-center p-8 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 mb-6">
                    <Lock className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic">Scanner Pausado</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Toca cualquier parte para reanudar</p>
            </div>
        );
    }

    if (isIdle) {
        return (
            <div className="absolute inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-in fade-in duration-1000">
                <div className="text-slate-100 text-[12rem] font-black tracking-tighter select-none">ZZZ</div>
                <p className="text-slate-300 font-black uppercase tracking-[0.4em] -mt-10">Ahorro de Energía</p>
            </div>
        );
    }

    return (
        <>
            {feedback === 'success' && <div className="scan-success-glow" />}
            {feedback === 'error' && (
                <div className="absolute inset-0 z-[5] bg-rose-500/5 animate-pulse pointer-events-none border-4 border-rose-500/20" />
            )}
            
            <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </>
    );
});
