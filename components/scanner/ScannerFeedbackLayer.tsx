import React, { memo } from 'react';
import { Lock, Coffee, AlertTriangle, Sparkles } from 'lucide-react';
// Corrected import: FeedbackStatus is exported from useFeedbackSystem, not ScannerFeedback from useScanner
import { FeedbackStatus } from '../../hooks/useFeedbackSystem';

interface ScannerFeedbackLayerProps {
 feedback: FeedbackStatus;
 isWindowFocused?: boolean;
 isIdle?: boolean;
}

export const ScannerFeedbackLayer: React.FC<ScannerFeedbackLayerProps> = memo(({ feedback, isWindowFocused = true, isIdle = false }) => {
 
 if (!isWindowFocused) {
 return (
 <div className="absolute inset-0 z-[100] bg-slate-900/90 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
 <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-rose-500 mb-6">
 <Lock className="w-12 h-12 text-rose-600" />
 </div>
 <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Láser Bloqueado</h2>
 <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Haz clic para reactivar el motor</p>
 </div>
 );
 }

 if (isIdle) {
 return (
 <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
 <div className="text-slate-800 text-[15rem] font-black tracking-tighter select-none animate-pulse">OFF</div>
 <p className="text-slate-600 font-black uppercase tracking-[0.5em] -mt-10">Consumo Reducido</p>
 </div>
 );
 }

 const getFeedbackStyles = () => {
 switch(feedback) {
 case 'success': return 'bg-emerald-500/20';
 case 'unknown': return 'bg-amber-500/30';
 case 'incident': return 'bg-rose-500/40';
 case 'error': return 'bg-red-600/50';
 case 'undo': return 'bg-slate-500/20';
 default: return 'bg-transparent';
 }
 };

 return (
 <>
 <div className={`absolute inset-0 z-0 transition-all duration-200 pointer-events-none ${getFeedbackStyles()}`} />
 
 {/* Indicadores de estado flotantes para Martillo Industrial */}
 {feedback === 'unknown' && (
 <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4">
 <Sparkles className="w-4 h-4" /> SKU Autoregistrado
 </div>
 )}
 
 {feedback === 'incident' && (
 <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4">
 <AlertTriangle className="w-4 h-4" /> Incidencia Registrada
 </div>
 )}
 </>
 );
});