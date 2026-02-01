
import React from 'react';
import { Delete, X, Check } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose?: () => void;
  onInput: (char: string) => void;
  onDelete: () => void;
  onConfirm?: () => void;
  title?: string;
  embedded?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, 
  onClose, 
  onInput, 
  onDelete, 
  onConfirm,
  title,
  embedded = false
}) => {
  
  const handlePress = (val: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onInput(val);
  };

  const handleDeletePress = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchstart') e.preventDefault();
    if (navigator.vibrate) navigator.vibrate(20);
    onDelete();
  };

  const handleConfirmPress = () => {
      if (navigator.vibrate) navigator.vibrate(40);
      if (onConfirm) onConfirm();
  };

  // --- MODO INTEGRADO (Dentro del Modal) ---
  if (embedded) {
      if (!isOpen) return null;
      return (
        <div className="w-full bg-slate-50 rounded-3xl p-1.5 touch-manipulation select-none">
            <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => handlePress(num.toString())}
                        className="h-14 bg-white text-slate-800 text-2xl font-bold rounded-xl shadow-[0_2px_0_#e2e8f0] active:shadow-none active:translate-y-[2px] transition-all flex items-center justify-center border border-slate-100"
                    >
                        {num}
                    </button>
                ))}

                {/* Fila Inferior */}
                <button
                    type="button"
                    onClick={() => handlePress("-")}
                    className="h-14 bg-slate-100 text-slate-500 text-2xl font-bold rounded-xl shadow-[0_2px_0_#cbd5e1] active:shadow-none active:translate-y-[2px] transition-all flex items-center justify-center border border-slate-200"
                >
                    -
                </button>

                <button
                    type="button"
                    onClick={() => handlePress("0")}
                    className="h-14 bg-white text-slate-800 text-2xl font-bold rounded-xl shadow-[0_2px_0_#e2e8f0] active:shadow-none active:translate-y-[2px] transition-all flex items-center justify-center border border-slate-100"
                >
                    0
                </button>

                <button
                    type="button"
                    onClick={() => onDelete()}
                    className="h-14 bg-rose-50 text-rose-500 rounded-xl shadow-[0_2px_0_#fecdd3] active:shadow-none active:translate-y-[2px] transition-all flex items-center justify-center border border-rose-100"
                >
                    <Delete className="w-7 h-7" />
                </button>
            </div>
        </div>
      );
  }

  // --- MODO OVERLAY (Sheet Inferior) ---
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 touch-manipulation`}>
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className={`bg-slate-900 border-t border-slate-700 rounded-t-[2.5rem] shadow-2xl p-4 w-full max-w-lg mx-auto animate-in slide-in-from-bottom-full duration-300 pb-safe-area`}>
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 opacity-50"></div>
        <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">{title || "Teclado"}</span>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 bg-slate-800 rounded-full active:bg-slate-700 transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>
        <div className="grid grid-cols-3 gap-3 select-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => handlePress(num.toString())} className="h-16 bg-slate-800 text-white text-3xl font-black rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all active:bg-slate-700">{num}</button>
            ))}
            
            {/* Botón Acción Izquierda: Confirmar o Guion */}
            {onConfirm ? (
                <button onClick={handleConfirmPress} className="h-16 bg-emerald-600 text-white rounded-2xl shadow-sm border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all active:bg-emerald-700 flex items-center justify-center">
                    <Check className="w-8 h-8 stroke-[4px]" />
                </button>
            ) : (
                <button onClick={() => handlePress("-")} className="h-16 bg-slate-800 text-white text-2xl font-bold rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all active:bg-slate-700">-</button>
            )}

            <button onClick={() => handlePress("0")} className="h-16 bg-slate-800 text-white text-3xl font-black rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all active:bg-slate-700">0</button>
            
            <button onClick={() => onDelete()} className="h-16 bg-slate-800 text-rose-500 rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center active:bg-slate-700"><Delete className="w-8 h-8" /></button>
        </div>
      </div>
    </div>
  );
};
