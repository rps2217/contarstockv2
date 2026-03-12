
import React, { memo } from 'react';
import { ChevronLeft, Save, MoreVertical, Lock } from 'lucide-react';

interface Props {
 isMigrating: boolean;
 hasItems: boolean;
 onBack: () => void;
 onFinalize: () => void;
 onOpenTools: () => void;
 onLock: () => void;
}

export const MassiveHeader: React.FC<Props> = memo(({ 
 isMigrating, hasItems, 
 onBack, onFinalize, onOpenTools, onLock
}) => {
 return (
 <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
 {/* IZQUIERDA: Navegación y Bloqueo Rápido */}
 <div className="flex items-center gap-3">
 <button 
 onClick={onBack} 
 className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors"
 >
 <ChevronLeft className="w-6 h-6 text-white" />
 </button>
 
 <button 
 onClick={onLock}
 className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl active:bg-amber-500 active:text-black transition-all group"
 >
 <Lock className="w-4 h-4 text-amber-500 group-active:text-black" />
 <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 group-active:text-black">
 Bloquear
 </span>
 </button>
 </div>
 
 {/* DERECHA: Finalizar y Menú de Herramientas */}
 <div className="flex items-center gap-2">
 <button 
 onClick={onFinalize} 
 disabled={!hasItems || isMigrating} 
 className="h-11 px-4 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 disabled:opacity-30 transition-all"
 >
 <Save className="w-5 h-5 text-white" />
 <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">Finalizar</span>
 </button>

 <button 
 onClick={(e) => {
 e.preventDefault();
 onOpenTools();
 }}
 className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-white/20 transition-all text-white"
 >
 <MoreVertical className="w-6 h-6" />
 </button>
 </div>
 </header>
 );
});
