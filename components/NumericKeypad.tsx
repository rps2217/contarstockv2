
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
  embedded?: boolean; 
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
    if (navigator.vibrate) navigator.vibrate(15);
    onInput(val);
  };

  const handleDeletePress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (navigator.vibrate) navigator.vibrate([10, 10]);
    onDelete();
  };

  const handleConfirmPress = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(40);
      if (onConfirm) onConfirm();
  };

  const KeyButton = ({ children, onClick, className = "" }: any) => (
    <button
        onPointerDown={onClick}
        className={`h-20 md:h-24 rounded-3xl text-3xl font-black transition-all active:scale-90 active:brightness-125 border-b-[6px] shadow-lg flex items-center justify-center select-none touch-none ${className}`}
    >
        {children}
    </button>
  );

  if (!isOpen) return null;

  const KeypadContent = (
    <div className={`w-full max-w-md mx-auto flex flex-col ${embedded ? '' : 'p-6'}`}>
        {!embedded && (
            <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-blue-400/60 text-[10px] font-black uppercase tracking-[0.4em] italic">{title || "Terminal_Input"}</span>
                {onClose && (
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 active:bg-rose-600 active:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
        )}

        {/* VISOR INDUSTRIAL */}
        <div className="mb-8 bg-black/80 rounded-[2.5rem] border-4 border-white/5 p-6 flex items-center justify-center h-32 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className={`font-mono font-black tracking-[0.2em] break-all text-center transition-all duration-200 ${value ? 'text-white text-4xl' : 'text-slate-800 text-2xl italic'}`}>
                {value || "SKU_PENDIENTE"}
                <span className="inline-block w-1.5 h-10 ml-3 bg-blue-500 animate-pulse align-middle shadow-[0_0_15px_#3b82f6]"></span>
            </div>
        </div>

        {/* GRID DE TECLAS */}
        <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <KeyButton 
                    key={num} 
                    onClick={(e: any) => handlePress(e, num.toString())}
                    className="bg-slate-800/80 border-slate-950 text-white hover:bg-slate-700"
                >
                    {num}
                </KeyButton>
            ))}
            
            <KeyButton 
                onClick={handleConfirmPress} 
                className="bg-emerald-600 border-emerald-900 text-white"
            >
                <Check className="w-10 h-10 stroke-[4px]" />
            </KeyButton>

            <KeyButton 
                onClick={(e: any) => handlePress(e, "0")}
                className="bg-slate-800/80 border-slate-950 text-white hover:bg-slate-700"
            >
                0
            </KeyButton>

            <KeyButton 
                onClick={handleDeletePress} 
                className="bg-slate-800/80 border-slate-950 text-rose-500 hover:bg-rose-900/20"
            >
                <Delete className="w-10 h-10 stroke-[2px]" />
            </KeyButton>
        </div>
    </div>
  );

  if (embedded) return KeypadContent;

  return (
    <div className="fixed inset-0 z-[400] flex flex-col justify-end bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-[#0f172a] border-t-8 border-blue-600/20 rounded-t-[4rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-full duration-500 pb-safe-area relative z-10">
        <div className="w-20 h-1.5 bg-slate-800 rounded-full mx-auto my-6"></div>
        {KeypadContent}
        <div className="h-8"></div>
      </div>
    </div>
  );
};
