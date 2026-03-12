import React, { memo } from 'react';
import { Lock, Coffee } from 'lucide-react';

interface ScannerFeedbackLayerProps {
 feedback: 'idle' | 'success' | 'error' | 'undo';
 isIncident?: boolean;
 isWindowFocused?: boolean;
 isIdle?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isIncident, isWindowFocused = true, isIdle = false }) => {
 // --- FOCUS GUARD OVERLAY ---
 if (!isWindowFocused) {
 return (
 <div className="absolute inset-0 z-50 bg-slate-900/60 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300 ">
 <div className="bg-white p-6 rounded-full mb-6 shadow-xl">
 <Lock className="w-12 h-12 text-blue-600" />
 </div>
 <h2 className="text-2xl font-bold text-white mb-2">Scanner Pausado</h2>
 <p className="text-slate-200 text-sm">Haga clic para continuar operando</p>
 </div>
 );
 }

 // --- IDLE PRIVACY OVERLAY ---
 if (isIdle) {
 return (
 <div className="absolute inset-0 z-50 bg-slate-50/95 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500 ">
 <Coffee className="w-12 h-12 text-slate-300 mb-6" />
 <h2 className="text-xl font-bold text-slate-500 uppercase tracking-widest">Modo Ahorro</h2>
 <p className="text-slate-400 text-sm mt-2">Presione cualquier tecla para reactivar</p>
 </div>
 );
 }

 // --- STANDARD FEEDBACK ---
 const getFeedbackLayerClass = () => {
 if (feedback === 'success') {
 if (isIncident) return 'bg-orange-500/10 opacity-100';
 return 'bg-green-500/10 opacity-100';
 }
 if (feedback === 'error') return 'bg-red-500/20 opacity-100';
 if (feedback === 'undo') return 'bg-slate-200 opacity-100';
 
 return 'bg-transparent opacity-100'; 
 };

 return (
 <div 
 className={`absolute inset-0 z-0 transition-colors duration-500 ease-out ${getFeedbackLayerClass()}`} 
 style={{ willChange: 'background-color' }}
 />
 );
});