import React, { memo } from 'react';
import { Lock, EyeOff, Coffee } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ScannerFeedbackLayerProps {
    feedback: 'idle' | 'success' | 'error' | 'undo';
    isIncident?: boolean;
    isWindowFocused?: boolean;
    isIdle?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isIncident, isWindowFocused = true, isIdle = false }) => {
    const { settings } = useAppStore();
    const lowPerf = settings.lowPerformanceMode;

    // --- FOCUS GUARD OVERLAY ---
    if (!isWindowFocused) {
        return (
            <div className={`absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500 ${lowPerf ? '' : 'backdrop-blur-xl'}`}>
                <div className="bg-slate-800/50 p-8 rounded-[3rem] mb-8 border border-white/5 shadow-2xl">
                    <Lock className="w-16 h-16 text-slate-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-200 uppercase tracking-widest mb-3">Pausa Operativa</h2>
                <p className="text-slate-500 font-medium text-lg max-w-xs">
                    Toque cualquier lugar para retomar el control del escáner.
                </p>
            </div>
        );
    }

    // --- IDLE PRIVACY BLUR ---
    if (isIdle) {
        return (
            <div className={`absolute inset-0 z-50 bg-[#0a0f1d]/95 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-1000 ${lowPerf ? '' : 'backdrop-blur-3xl'}`}>
                <div className="w-28 h-28 bg-slate-800/40 rounded-full flex items-center justify-center mb-8 border border-white/5">
                    <Coffee className="w-12 h-12 text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-300 uppercase tracking-tighter mb-3">Protección Visual</h2>
                <p className="text-slate-500 text-sm max-w-[280px] font-medium leading-relaxed">
                    Datos ocultos por inactividad prolongada.<br/>Presione una tecla para restaurar la vista.
                </p>
            </div>
        );
    }

    // --- STANDARD FEEDBACK (Suavizado: Opacidad reducida y colores apagados) ---
    const getFeedbackLayerClass = () => {
        if (feedback === 'success') {
            if (isIncident) return 'bg-amber-900/30 opacity-100';
            return 'bg-emerald-900/30 opacity-100';
        }
        if (feedback === 'error') return 'bg-rose-950/40 opacity-100';
        if (feedback === 'undo') return 'bg-slate-800 opacity-100';
        
        return 'bg-transparent opacity-100'; 
    };

    return (
        <div 
            className={`absolute inset-0 z-0 transition-colors duration-700 ease-out ${getFeedbackLayerClass()}`} 
            style={{ willChange: 'background-color' }}
        />
    );
});