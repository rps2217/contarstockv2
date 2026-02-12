
import React, { useEffect, useCallback, useState } from 'react';
import { X, Check, Delete, Keyboard as KeyboardIcon, Zap } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalValue: string) => void;
  title?: string;
  value?: string; 
  placeholder?: string;
  // Estos props se mantienen por compatibilidad pero se desaconseja su uso para registro de SKUs
  onInput?: (char: string) => void;
  onDelete?: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, onClose, onConfirm, title, value, placeholder = "ESPERANDO_INPUT...", onInput, onDelete
}) => {
  const [internalBuffer, setInternalBuffer] = useState("");
  
  // Sincronizar o resetear buffer al abrir
  useEffect(() => {
    if (isOpen) {
      setInternalBuffer(value || "");
    }
  }, [isOpen, value]);

  const displayValue = value !== undefined ? value : internalBuffer;

  const handleChar = useCallback((char: string) => {
    if (onInput) {
        onInput(char);
    } else {
        setInternalBuffer(prev => (prev.length < 25 ? prev + char : prev));
    }
    SoundFX.play('increment');
  }, [onInput]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
        onDelete();
    } else {
        setInternalBuffer(prev => prev.slice(0, -1));
    }
    SoundFX.play('delete');
  }, [onDelete]);

  const handleConfirm = useCallback(() => {
    const final = value !== undefined ? value : internalBuffer;
    if (final.length > 0) {
      onConfirm(final);
      setInternalBuffer(""); // Limpiar tras confirmar
    }
  }, [value, internalBuffer, onConfirm]);

  // Soporte para teclado físico cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
          e.stopPropagation();
          handleChar(e.key);
      } else if (e.key === 'Backspace') {
          e.stopPropagation();
          handleDelete();
      } else if (e.key === 'Enter') {
          e.stopPropagation();
          handleConfirm();
      } else if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [isOpen, handleChar, handleDelete, handleConfirm, onClose]);

  if (!isOpen) return null;

  const Key = ({ children, onClick, variant = "default" }: any) => {
    const styles: any = {
      default: "bg-slate-800 border-slate-950 text-white active:bg-blue-600",
      confirm: "bg-blue-600 border-blue-900 text-white active:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]",
      delete: "bg-rose-900/40 border-rose-950 text-rose-500 active:bg-rose-600 active:text-white"
    };
    return (
      <button 
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} 
        className={`h-20 md:h-24 rounded-2xl text-3xl font-black transition-all active:scale-90 border-b-[6px] flex items-center justify-center select-none touch-none ${styles[variant]}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-[#0f172a] border-t-8 border-blue-600 rounded-t-[3.5rem] shadow-[0_-25px_80px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-full duration-500 relative z-10 pb-safe-area">
        <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto my-6"></div>
        
        <div className="px-6 pb-8 flex flex-col w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] italic">{title || "Entrada_Manual"}</span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white/40 active:bg-rose-600 active:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* LCD VISOR */}
            <div className="mb-8 bg-black rounded-3xl border-4 border-white/5 p-6 flex flex-col justify-center h-32 shadow-inner relative overflow-hidden">
                <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest">Manual_Entry_Buffer</span>
                    <KeyboardIcon className="w-3 h-3 text-blue-500/20" />
                </div>
                <div className={`font-mono font-black tracking-[0.2em] break-all text-center transition-all duration-75 ${displayValue ? 'text-white text-4xl' : 'text-slate-800 text-2xl italic'}`}>
                    {displayValue || placeholder}
                    <span className="inline-block w-1.5 h-8 ml-3 bg-blue-500 animate-pulse align-middle"></span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Key key={num} onClick={() => handleChar(num.toString())}>{num}</Key>
                ))}
                <Key variant="delete" onClick={handleDelete}><Delete className="w-8 h-8" /></Key>
                <Key onClick={() => handleChar("0")}>0</Key>
                <Key variant="confirm" onClick={handleConfirm}><Check className="w-10 h-10 stroke-[4px]" /></Key>
            </div>
        </div>
      </div>
    </div>
  );
};
