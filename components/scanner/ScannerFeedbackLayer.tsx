
import React, { memo } from 'react';
import { Lock, EyeOff } from 'lucide-react';
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
            <div className={`absolute inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-200 ${lowPerf ? '' : 'backdrop-blur-md'}`}>
                <div className={`bg-slate-800 p-6 rounded-full mb-6 border border-slate-700 shadow-2xl ${lowPerf ? '' : 'animate-pulse'}`}>
                    <Lock className="w-16 h-16 text-slate-400" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Pausa Automática</h2>
                <p className="text-slate-400 font-medium text-lg max-w-xs">
                    La aplicación perdió el foco. Toque la pantalla para continuar.
                </p>
            </div>
        );
    }

    // --- IDLE PRIVACY BLUR ---
    if (isIdle) {
        return (
            <div className={`absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500 ${lowPerf ? '' : 'backdrop-blur-3xl zoom-in-105'}`}>
                <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
                    <EyeOff className="w-12 h-12 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Modo Privacidad</h2>
                <p className="text-slate-500 text-sm max-w-[240px]">
                    Datos ocultos por inactividad. Presione cualquier tecla para restaurar.
                </p>
            </div>
        );
    }

    // --- STANDARD FEEDBACK ---
    const getFeedbackLayerClass = () => {
        if (feedback === 'success') {
            if (isIncident) return 'bg-amber-600 opacity-100';
            return 'bg-emerald-600 opacity-100';
        }
        if (feedback === 'error') return 'bg-red-600 opacity-100';
        if (feedback === 'undo') return 'bg-purple-600 opacity-100';
        
        if (isIncident) return 'bg-amber-900 opacity-100'; 
        return 'bg-slate-950 opacity-100'; 
    };

    return (
        <div 
            className={`absolute inset-0 z-0 transition-colors duration-150 ease-out ${getFeedbackLayerClass()}`} 
            style={{ willChange: 'background-color' }}
        />
    );
});
