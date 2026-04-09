
import React, { memo } from 'react';
import { CheckCircle2, AlertTriangle, Activity } from 'lucide-react';

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
 // Estilos dinámicos
 const textColor = isEcoMode ? 'text-white/80' : 'text-white';

 return (
 <div className="h-[30vh] shrink-0 flex flex-col items-center justify-center p-4 relative border-b-4 border-black bg-brand-dark transition-colors duration-300 overflow-hidden select-none">
 
 {/* Fondo Gradiente Sutil (Sin círculos sólidos) */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-info/10 via-brand-dark to-brand-dark pointer-events-none"></div>

 {/* ZONA SUPERIOR: Feedback de Último Scan */}
 <div className="flex-1 flex flex-col justify-end w-full items-center pb-4 z-10">
 {lastAction ? (
 <div className="flex flex-col items-center animate-in slide-in-from-bottom-2 fade-in duration-200 w-full">
 {/* Chip de Estado */}
 <div className={`inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-lg bg-black/60 border border-white/10 shadow-sm`}>
 {lastAction.type === 'success' ? (
 <CheckCircle2 className="w-3 h-3 text-emerald-500" />
 ) : (
 <AlertTriangle className="w-3 h-3 text-rose-500" />
 )}
 <span className={`text-[9px] font-black uppercase tracking-widest ${lastAction.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
 {lastAction.type === 'success' ? 'REGISTRADO' : 'DUPLICADO'}
 </span>
 </div>
 
 {/* Código Escaneado */}
 <span className="font-mono font-black text-2xl md:text-3xl text-white tracking-widest truncate max-w-full px-4">
 {lastAction.label}
 </span>
 </div>
 ) : (
 <div className="flex items-center gap-2 opacity-30 mb-2">
 <Activity className="w-4 h-4 text-slate-400" />
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listo para escanear</span>
 </div>
 )}
 </div>

 {/* ZONA CENTRAL: Contador Gigante (Limpio, sin iconos) */}
 <div className="flex-[2] flex flex-col items-center justify-start z-10 w-full">
 <div className={`text-[7rem] md:text-[9rem] leading-none font-black tabular-nums tracking-tighter drop-shadow-2xl ${textColor}`}>
 {draftCount}
 </div>
 <div className="mt-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] bg-brand-surface/50 px-4 py-1.5 rounded-full border border-white/5 ">
 Bultos en Cola
 </div>
 </div>
 </div>
 );
});

// Forced GitHub sync
