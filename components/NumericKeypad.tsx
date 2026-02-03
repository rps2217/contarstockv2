import React from 'react';
import { X, Check, Delete } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose?: () => void;
  onInput: (char: string) => void;
  onDelete: () => void;
  onConfirm?: () => void;
  title?: string;
  value?: string; 
  embedded?: boolean; // Si es true, no renderiza visor ni fondo oscuro
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, 
  onClose, 
  onInput, 
  onDelete, 
  onConfirm,
  title,
  value = "", 
  embedded = false
}) => {
  
  const handlePress = (e: React.MouseEvent | React.TouchEvent, val: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(12);
    onInput(val);
  };

  const handleDeletePress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate([15, 10]);
    onDelete();
  };

  const handleConfirmPress = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(40);
      if (onConfirm) onConfirm();
  };

  const getVisorFontSize = (val: string) => {
      if (val.length > 15) return 'text-xl';
      if (val.length > 10) return 'text-2xl';
      return 'text-4xl';
  };

  const KeyButton = ({ children, onClick, className = "" }: any) => (
    <button
        onClick={onClick}
        className={`h-20 md:h-24 rounded-[2rem] text-3xl font-black transition-all active:scale-90 active:brightness-125 border-b-8 shadow-xl flex items-center justify-center ${className}`}
    >
        {children}
    </button>
  );

  if (!isOpen) return null;

  // --- CONTENIDO DEL TECLADO ---
  const KeypadBody = (
    <div className={`w-full select-none touch-manipulation ${embedded ? '' : 'max-w-lg mx-auto p-6'}`}>
        {!embedded && (
            <>
                <div className="flex justify-between items-center mb-6 px-4">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] italic">{title || "Entrada_Manual"}</span>
                    {onClose && (
                        <button onClick={onClose} className="p-3 bg-slate-800 text-slate-400 rounded-full active:bg-rose-600 active:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="mb-8 bg-black/60 rounded-[2.5rem] border-4 border-slate-800 p-6 flex items-center justify-center h-28 shadow-inner relative overflow-hidden">
                    <div className={`font-mono font-black tracking-[0.15em] break-all text-center transition-all duration-200 ${getVisorFontSize(value)} ${value ? 'text-white' : 'text-slate-700 italic'}`}>
                        {value || "SKU_PENDIENTE"}
                        <span className="inline-block w-1.5 h-8 ml-2 bg-blue-500 animate-pulse align-middle shadow-[0_0_10px_#3b82f6]"></span>
                    </div>
                </div>
            </>
        )}

        <div className={`grid grid-cols-3 gap-4 ${embedded ? 'p-2 bg-slate-900/40 rounded-[2.5rem]' : ''}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <KeyButton 
                    key={num} 
                    onClick={(e: any) => handlePress(e, num.toString())}
                    className="bg-slate-800 border-slate-950 text-white"
                >
                    {num}
                </KeyButton>
            ))}
            
            {/* Fila Inferior Especial */}
            <KeyButton 
                onClick={handleConfirmPress} 
                className="bg-emerald-600 border-emerald-900 text-white"
            >
                <Check className="w-10 h-10 stroke-[5px]" />
            </KeyButton>

            <KeyButton 
                onClick={(e: any) => handlePress(e, "0")}
                className="bg-slate-800 border-slate-950 text-white"
            >
                0
            </KeyButton>

            <KeyButton 
                onClick={handleDeletePress} 
                className="bg-slate-800 border-slate-950 text-rose-500"
            >
                <Delete className="w-10 h-10 stroke-[2.5px]" />
            </KeyButton>
        </div>
    </div>
  );

  if (embedded) return KeypadBody;

  return (
    <div className="fixed inset-0 z-[400] flex flex-col justify-end bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-slate-900 border-t-8 border-blue-600/30 rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-500 pb-safe-area relative z-10">
        <div className="w-16 h-2 bg-slate-700/50 rounded-full mx-auto my-6"></div>
        {KeypadBody}
        <div className="h-8"></div>
      </div>
    </div>
  );
};