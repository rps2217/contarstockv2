
import React, { useEffect, useCallback } from 'react';
import { X, Check, Delete, Hash, Keyboard as KeyboardIcon } from 'lucide-react';

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
  isOpen, onClose, onInput, onDelete, onConfirm, title, value = "", embedded = false
}) => {
  
  // Soporte para Teclado Físico y Escáneres HID
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key >= '0' && e.key <= '9') {
      onInput(e.key);
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (e.key === 'Backspace') {
      onDelete();
      if (navigator.vibrate) navigator.vibrate(15);
    } else if (e.key === 'Enter') {
      if (onConfirm) onConfirm();
      if (navigator.vibrate) navigator.vibrate(40);
    } else if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }, [isOpen, onInput, onDelete, onConfirm, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const KeyButton = ({ children, onClick, className = "", variant = "default" }: any) => {
    const base = "h-20 md:h-24 rounded-2xl text-3xl font-black transition-all active:scale-95 border-b-[6px] flex items-center justify-center select-none touch-none";
    const styles: any = {
      default: "bg-slate-800 border-slate-950 text-white active:bg-slate-700",
      action: "bg-blue-600 border-blue-900 text-white active:bg-blue-500",
      confirm: "bg-emerald-600 border-emerald-900 text-white active:bg-emerald-500",
      delete: "bg-rose-900/40 border-rose-950 text-rose-500 active:bg-rose-800"
    };
    return (
      <button onPointerDown={(e) => { e.preventDefault(); onClick(); }} className={`${base} ${styles[variant]} ${className}`}>
        {children}
      </button>
    );
  };

  if (!isOpen) return null;

  const content = (
    <div className={`w-full max-w-md mx-auto flex flex-col ${embedded ? '' : 'p-6'}`}>
        {!embedded && (
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Hash className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-blue-400/60 text-[10px] font-black uppercase tracking-[0.4em] italic">
                        {title || "Input_Terminal"}
                    </span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white/40 active:bg-rose-600 active:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
        )}

        {/* VISOR INDUSTRIAL LCD STYLE */}
        <div className="mb-8 bg-black rounded-3xl border-4 border-white/5 p-6 flex flex-col justify-center h-32 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-50 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest">Data_Stream</span>
                <KeyboardIcon className="w-3 h-3 text-blue-500/20" />
            </div>
            <div className={`font-mono font-black tracking-[0.2em] break-all text-center transition-all duration-200 ${value ? 'text-white text-4xl' : 'text-slate-800 text-2xl italic'}`}>
                {value || "SKU_WAITING..."}
                <span className="inline-block w-1 h-8 ml-3 bg-blue-500 animate-pulse align-middle shadow-[0_0_15px_#3b82f6]"></span>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <KeyButton key={num} onClick={() => onInput(num.toString())}>{num}</KeyButton>
            ))}
            <KeyButton variant="delete" onClick={onDelete}><Delete className="w-8 h-8" /></KeyButton>
            <KeyButton onClick={() => onInput("0")}>0</KeyButton>
            <KeyButton variant="confirm" onClick={() => onConfirm?.()}><Check className="w-10 h-10 stroke-[4px]" /></KeyButton>
        </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-[500] flex flex-col justify-end bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="bg-[#0f172a] border-t-8 border-blue-600/30 rounded-t-[3.5rem] shadow-[0_-25px_80px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-full duration-500 pb-safe-area relative z-10">
        <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto my-6"></div>
        {content}
        <div className="h-8"></div>
      </div>
    </div>
  );
};
