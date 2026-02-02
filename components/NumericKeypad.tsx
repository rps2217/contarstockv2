
import React from 'react';
import { Delete, X, Check } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose?: () => void;
  onInput: (char: string) => void;
  onDelete: () => void;
  onConfirm?: () => void;
  title?: string;
  value?: string; // Nuevo prop para el visor
  embedded?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, 
  onClose, 
  onInput, 
  onDelete, 
  onConfirm,
  title,
  value = "", // Valor por defecto
  embedded = false
}) => {
  
  const handlePress = (e: React.MouseEvent | React.TouchEvent, val: string) => {
    // Prevenir propagación para evitar cierres fantasma
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.vibrate) navigator.vibrate(10);
    onInput(val);
  };

  const handleDeletePress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(20);
    onDelete();
  };

  const handleConfirmPress = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(40);
      if (onConfirm) onConfirm();
  };

  // --- MODO INTEGRADO (Dentro del Modal - Sin visor grande) ---
  if (embedded) {
      if (!isOpen) return null;
      return (
        <div className="w-full bg-slate-100/50 rounded-2xl p-1 touch-manipulation select-none">
            <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={(e) => handlePress(e, num.toString())}
                        className="h-14 bg-white text-slate-800 text-xl font-black rounded-xl shadow-sm active:bg-blue-600 active:text-white transition-all flex items-center justify-center border-b-2 border-slate-200 active:border-b-0 active:translate-y-0.5"
                    >
                        {num}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={(e) => handlePress(e, "-")}
                    className="h-14 bg-slate-200 text-slate-500 text-xl font-black rounded-xl shadow-sm active:bg-slate-300 transition-all flex items-center justify-center border-b-2 border-slate-300 active:border-b-0 active:translate-y-0.5"
                >
                    -
                </button>

                <button
                    type="button"
                    onClick={(e) => handlePress(e, "0")}
                    className="h-14 bg-white text-slate-800 text-xl font-black rounded-xl shadow-sm active:bg-blue-600 active:text-white transition-all flex items-center justify-center border-b-2 border-slate-200 active:border-b-0 active:translate-y-0.5"
                >
                    0
                </button>

                <button
                    type="button"
                    onClick={handleDeletePress}
                    className="h-14 bg-rose-50 text-rose-500 rounded-xl shadow-sm active:bg-rose-600 active:text-white transition-all flex items-center justify-center border-b-2 border-rose-200 active:border-b-0 active:translate-y-0.5"
                >
                    <Delete className="w-6 h-6" />
                </button>
            </div>
        </div>
      );
  }

  // --- MODO OVERLAY (Sheet Inferior CON VISOR) ---
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 touch-manipulation">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-slate-900 border-t border-slate-700 rounded-t-[2.5rem] shadow-2xl p-4 w-full max-w-lg mx-auto animate-in slide-in-from-bottom-full duration-300 pb-safe-area relative z-10">
        
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 opacity-50"></div>
        
        {/* Header con Título y Cerrar */}
        <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title || "Entrada Manual"}</span>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 bg-slate-800 rounded-full active:bg-slate-700 transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* VISOR (DISPLAY) */}
        <div className="mb-6 bg-black rounded-2xl border-2 border-slate-800 p-4 flex items-center justify-end h-20 shadow-inner">
            <span className={`font-mono font-black text-4xl tracking-wider truncate ${value ? 'text-white' : 'text-slate-600'}`}>
                {value || "0"}
                {/* Cursor parpadeante */}
                <span className="inline-block w-0.5 h-8 ml-1 bg-blue-500 animate-pulse align-middle"></span>
            </span>
        </div>

        {/* Grid de Teclas */}
        <div className="grid grid-cols-3 gap-3 select-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                    key={num} 
                    onClick={(e) => handlePress(e, num.toString())} 
                    className="h-16 bg-slate-800 text-white text-3xl font-black rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all active:bg-slate-700"
                >
                    {num}
                </button>
            ))}
            
            {/* Botón Acción Izquierda: Confirmar o Guion */}
            {onConfirm ? (
                <button onClick={handleConfirmPress} className="h-16 bg-emerald-600 text-white rounded-2xl shadow-sm border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all active:bg-emerald-700 flex items-center justify-center">
                    <Check className="w-8 h-8 stroke-[4px]" />
                </button>
            ) : (
                <button onClick={(e) => handlePress(e, "-")} className="h-16 bg-slate-800 text-white text-2xl font-bold rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all active:bg-slate-700">-</button>
            )}

            <button onClick={(e) => handlePress(e, "0")} className="h-16 bg-slate-800 text-white text-3xl font-black rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all active:bg-slate-700">0</button>
            
            <button onClick={handleDeletePress} className="h-16 bg-slate-800 text-rose-500 rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center active:bg-slate-700">
                <Delete className="w-8 h-8" />
            </button>
        </div>
      </div>
    </div>
  );
};
