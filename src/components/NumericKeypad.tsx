
import React, { useEffect, useCallback, useState } from 'react';
import { X, Check, Delete, Keyboard as KeyboardIcon, Zap } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface NumericKeypadProps {
 isOpen: boolean;
 onClose?: () => void;
 onConfirm?: (finalValue: string) => void;
 title?: string;
 value?: string; 
 placeholder?: string;
 // FIX: Added embedded, onInput, and onDelete props to support usage in StartSessionModal.tsx
 embedded?: boolean;
 onInput?: (char: string) => void;
 onDelete?: () => void;
}

/**
 * NUMERIC KEYPAD PDA v5.5
 * Botones masivos para evitar errores de digitación en movimiento.
 */
export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
 isOpen, onClose, onConfirm, title, value, placeholder = "READY_FOR_INPUT",
 embedded, onInput, onDelete
}) => {
 const [internalBuffer, setInternalBuffer] = useState("");
 
 useEffect(() => {
 if (isOpen) setInternalBuffer(value || "");
 }, [isOpen, value]);

 const handleChar = useCallback((char: string) => {
 setInternalBuffer(prev => (prev.length < 25 ? prev + char : prev));
 onInput?.(char);
 SoundFX.play('increment');
 }, [onInput]);

 const handleDelete = useCallback(() => {
 setInternalBuffer(prev => prev.slice(0, -1));
 onDelete?.();
 SoundFX.play('delete');
 }, [onDelete]);

 const handleConfirm = useCallback(() => {
 if (internalBuffer.trim().length > 0) {
 onConfirm?.(internalBuffer.trim());
 setInternalBuffer("");
 }
 }, [internalBuffer, onConfirm]);

 if (!isOpen) return null;

 const Key = ({ children, onClick, variant = "default" }: any) => {
  const styles: any = {
    default: "bg-brand-accent text-brand-dark active:bg-brand-info active:text-white border-brand-accent/20",
    confirm: "bg-brand-warning text-white active:bg-brand-warning/80 shadow-xl border-brand-warning/30",
    delete: "bg-brand-surface text-brand-accent active:bg-rose-600 active:text-white border-white/5"
  };
  return (
    <button 
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} 
      className={`h-20 w-20 md:h-24 md:w-24 rounded-full text-4xl font-black transition-all active:scale-90 border-b-4 flex items-center justify-center select-none touch-none mx-auto ${styles[variant]}`}
    >
      {children}
    </button>
  );
 };

 // FIX: Added embedded rendering mode for inline usage
 if (embedded) {
  return (
  <div className="grid grid-cols-3 gap-6 py-4">
  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
  <Key key={num} onClick={() => handleChar(num.toString())}>{num}</Key>
  ))}
  <Key variant="delete" onClick={handleDelete}><Delete className="w-10 h-10" /></Key>
  <Key onClick={() => handleChar("0")}>0</Key>
  <Key variant="confirm" onClick={handleConfirm}><Check className="w-12 h-12 stroke-[5px]" /></Key>
  </div>
  );
 }

 return (
 <div className="fixed inset-0 z-[2000] flex flex-col justify-end bg-brand-dark/95 backdrop-blur-md animate-in fade-in duration-300">
 <div className="absolute inset-0" onClick={onClose}></div>
 
 <div className="bg-brand-dark border-t-8 border-brand-warning rounded-t-[4rem] shadow-[0_-30px_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-full duration-500 relative z-10 pb-safe-area">
 <div className="w-20 h-2 bg-white/10 rounded-full mx-auto my-6"></div>
 
 <div className="px-6 pb-10 flex flex-col w-full max-w-lg mx-auto">
 <div className="flex justify-between items-center mb-6 px-4">
 <div className="flex items-center gap-3">
 <Zap className="w-5 h-5 text-brand-info animate-pulse" />
 <span className="text-brand-info text-[11px] font-black uppercase tracking-[0.4em] italic">{title || "Manual_Entry"}</span>
 </div>
 <button onClick={onClose} className="p-4 bg-white/5 rounded-2xl text-white/40 active:bg-rose-600 active:text-white transition-colors">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* LCD VISOR PDA */}
 <div className="mb-8 bg-black/40 rounded-[2.5rem] border-4 border-white/5 p-8 flex flex-col justify-center h-36 shadow-inner relative overflow-hidden">
 <div className="flex justify-between items-center mb-3 px-2">
 <span className="text-[9px] font-black text-brand-info/40 uppercase tracking-widest">Input_Buffer</span>
 <KeyboardIcon className="w-4 h-4 text-brand-info/20" />
 </div>
 <div className={`font-mono font-black tracking-[0.2em] break-all text-center transition-all duration-75 ${internalBuffer ? 'text-white text-5xl' : 'text-slate-800 text-2xl italic'}`}>
 {internalBuffer || placeholder}
 <span className="inline-block w-2 h-10 ml-4 bg-brand-warning animate-pulse align-middle"></span>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-6">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
 <Key key={num} onClick={() => handleChar(num.toString())}>{num}</Key>
 ))}
 <Key variant="delete" onClick={handleDelete}><Delete className="w-10 h-10" /></Key>
 <Key onClick={() => handleChar("0")}>0</Key>
 <Key variant="confirm" onClick={handleConfirm}><Check className="w-12 h-12 stroke-[5px]" /></Key>
 </div>
 </div>
 </div>
 </div>
 );
};
// Forced GitHub sync
