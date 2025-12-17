
import React, { memo } from 'react';
import { Lock } from 'lucide-react';

interface ScannerFeedbackLayerProps {
    feedback: 'idle' | 'success' | 'error' | 'undo';
    isIncident?: boolean;
    isWindowFocused?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isIncident, isWindowFocused = true }) => {
    
    // --- FOCUS GUARD OVERLAY ---
    if (!isWindowFocused) {
        return (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-200">
                <div className="bg-slate-800 p-6 rounded-full mb-6 border border-slate-700 shadow-2xl animate-pulse">
                    <Lock className="w-16 h-16 text-slate-400" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Pausa Automática</h2>
                <p className="text-slate-400 font-medium text-lg max-w-xs">
                    La aplicación perdió el foco. Toque la pantalla para continuar escaneando.
                </p>
                <div className="mt-8 text-xs text-slate-600 font-mono uppercase border border-slate-800 rounded px-2 py-1">
                    Protection Mode Active
                </div>
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
        
        // Idle states (Backgrounds)
        if (isIncident) return 'bg-amber-900 opacity-100'; 
        return 'bg-slate-950 opacity-100'; 
    };

    return (
        <div 
            className={`absolute inset-0 z-0 transition-colors duration-200 ease-out ${getFeedbackLayerClass()}`} 
            style={{ willChange: 'background-color' }}
        />
    );
});