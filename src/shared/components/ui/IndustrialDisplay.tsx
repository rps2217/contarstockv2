
import React, { memo } from 'react';
import { Minus, Plus, Target, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { determineItemStatus, getStatusColorClasses } from '../../../services/uiLogic';

interface IndustrialDisplayProps {
 barcode: string | null;
 name: string | null;
 quantity: number;
 targetQuantity?: number;
 feedback?: string;
 onIncrement: () => void;
 onDecrement: () => void;
 statusLabel?: string;
}

/**
 * HUD INDUSTRIAL v7.0 (Unified Core)
 * Única fuente de verdad para el visor de conteo en toda la aplicación.
 */
export const IndustrialDisplay: React.FC<IndustrialDisplayProps> = memo(({
 barcode, name, quantity, targetQuantity, feedback, onIncrement, onDecrement, statusLabel
}) => {
 if (!barcode) {
 return (
 <div className="h-full w-full flex flex-col items-center justify-center bg-base border-b-4 border-black group">
 <div className="relative">
 <Target className="w-24 h-24 mb-6 text-slate-800 animate-pulse group-active:text-blue-500 transition-colors" />
 <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full"></div>
 </div>
 <p className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-700 animate-pulse">Waiting_Scan</p>
 </div>
 );
 }

 const status = determineItemStatus(quantity, targetQuantity);
 const bgClass = getStatusColorClasses(status, 'bg');
 const isError = status === 'error';

 return (
 <div className={`w-full h-full flex flex-col relative transition-colors duration-300 transform-gpu overflow-hidden ${bgClass}`}>
 
 {/* Flash de confirmación industrial (Overlay) */}
 {feedback === 'success' && <div className="absolute inset-0 z-50 bg-white/20 pointer-events-none animate-flash-fast"></div>}
 
 <div className="flex-1 flex items-stretch relative z-10">
 {/* ZONA DE DECREMENTO (Lado Izquierdo - Optimizada para PDAs) */}
 <button 
 onPointerDown={(e) => { e.preventDefault(); onDecrement(); }}
 className="w-[22%] bg-black/10 active:bg-black/40 flex items-center justify-center border-r border-white/5 transition-colors"
 >
 <Minus className="w-14 h-14 text-white/30 active:text-white" strokeWidth={3} />
 </button>

 {/* VISOR CENTRAL GIGANTE */}
 <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden relative">
 <div className="w-full px-4 mb-1">
 <div className="font-mono text-[10px] font-black text-white/50 tracking-widest truncate mb-1">
 {barcode}
 </div>
 <h2 className="text-white font-black text-[13px] md:text-sm uppercase tracking-tight line-clamp-1 italic leading-tight">
 {name || 'SKU_IDENTIFIED'}
 </h2>
 </div>

 {/* CANTIDAD (Legibilidad radical) */}
 <div className="relative flex items-center justify-center">
 <div className="text-[11rem] md:text-[14rem] font-black tabular-nums tracking-tighter drop-shadow-[0_20px_60px_rgba(0,0,0,0.5)] leading-[0.85] select-none text-white transform-gpu">
 {Math.max(0, quantity)}
 </div>
 
 {isError && (
 <div className="absolute -right-8 top-1/2 -translate-y-1/2 animate-bounce">
 <AlertTriangle className="w-12 h-12 text-white fill-rose-600" />
 </div>
 )}
 </div>
 
 {/* INDICADOR DE META / STATUS */}
 <div className="mt-3 flex items-center gap-3">
 {targetQuantity !== undefined && targetQuantity > 0 ? (
 <div className="bg-black/60 px-6 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 border-2 border-white/10 shadow-2xl">
 {quantity >= targetQuantity ? (
 <CheckCircle className="w-4 h-4 text-emerald-400" fill="currentColor" />
 ) : (
 <div className="w-4 h-4 rounded-full border-2 border-blue-400 animate-pulse"></div>
 )}
 <span className="text-white/40">Target:</span>
 <span className="text-white">{targetQuantity}</span>
 </div>
 ) : statusLabel ? (
 <div className="bg-white/10 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
 <Zap className="w-3.5 h-3.5 text-blue-400" />
 <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{statusLabel}</span>
 </div>
 ) : null}
 </div>
 </div>

 {/* ZONA DE INCREMENTO (Lado Derecho) */}
 <button 
 onPointerDown={(e) => { e.preventDefault(); onIncrement(); }}
 className="w-[22%] bg-black/10 active:bg-black/40 flex items-center justify-center border-l border-white/5 transition-colors"
 >
 <Plus className="w-14 h-14 text-white/30 active:text-white" strokeWidth={3} />
 </button>
 </div>

 <style>{`
 @keyframes flash-fast { 0% { opacity: 1; } 100% { opacity: 0; } }
 .animate-flash-fast { animation: flash-fast 0.15s ease-out forwards; }
 `}</style>
 </div>
 );
});

