
import React, { memo } from 'react';

interface ScannerFeedbackLayerProps {
    feedback: 'idle' | 'success' | 'error' | 'undo';
    isIncident?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isIncident }) => {
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
