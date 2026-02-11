
import React, { useEffect, useCallback, useState } from 'react';
import { X, Check, Delete, Hash, Keyboard as KeyboardIcon, Zap } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalValue: string) => void;
  title?: string;
  initialValue?: string;
  placeholder?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, onClose, onConfirm, title, initialValue = "", placeholder = "ESPERANDO_INPUT..."
}) => {
  const [buffer, setBuffer] = useState(initialValue);

  // Reiniciar buffer al abrir
  useEffect(() => {
    if (isOpen) setBuffer(initialValue);
  }, [isOpen, initialValue]);

  const handleInput = useCallback((char: string) => {
    setBuffer(prev => (prev.length < 25 ? prev + char : prev));
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  const handleDelete = useCallback(() => {
    setBuffer(prev => prev.slice(0, -1));
    if (navigator.vibrate) navigator.vibrate(15);
  }, []);

  const handleConfirm = useCallback(() => {
    if (buffer.length > 0) {
      onConfirm(buffer);
      setBuffer("");
    }
  }, [buffer, onConfirm]);

  // Escucha Global de Hardware (Teclado/Escáner)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleInput(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Enter') handleConfirm();
      else if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleInput, handleDelete, handleConfirm, onClose]);

  if (!isOpen) return null;

  const KeyButton = ({ children, onClick, variant = "default" }: any) => {
    const styles: any = {
      default: "bg-slate-800 border-slate-950 text-white active:bg-blue-600",
      confirm: "bg-blue-600 border-blue-900 text-white active:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]",
      delete: "bg-rose-900/40 border-rose-950 text-rose-500 active:bg-rose-600 active:text-white"
    };
    return (
      <button 
        onPointerDown={(e) => { e.preventDefault(); onClick(); }} 
        className={`h-20 md:h-24 rounded-2xl text-3xl font-black transition-all active:scale-90 border-b-[6px] flex items-center justify-center select-none touch-none ${styles[variant]}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-[#0f172a] border-t-8 border-blue-600 rounded-t-[3.5rem] shadow-[0_-25px_80px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-full duration-500 relative z-10 pb-safe-area">
        <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto my-6"></div>
        
        <div className="px-6 pb-8 flex flex-col w-full max-w-md mx-auto">
            {/* Header del Teclado */}
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                    </div>
                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] italic">
                        {title || "Terminal_Manual"}
                    </span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white/40 active:bg-rose-600 active:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* VISOR INDUSTRIAL LCD */}
            <div className="mb-8 bg-black rounded-3xl border-4 border-white/5 p-6 flex flex-col justify-center h-32 shadow-inner relative overflow-hidden ring-4 ring-blue-600/10">
                <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest">Input_Status: {isOpen ? 'Online' : 'Offline'}</span>
                    <KeyboardIcon className="w-3 h-3 text-blue-500/20" />
                </div>
                <div className={`font-mono font-black tracking-[0.2em] break-all text-center transition-all duration-100 ${buffer ? 'text-white text-4xl' : 'text-slate-800 text-2xl italic'}`}>
                    {buffer || placeholder}
                    <span className="inline-block w-1.5 h-8 ml-3 bg-blue-500 animate-pulse align-middle shadow-[0_0_15px_#3b82f6]"></span>
                </div>
            </div>

            {/* Grid de Teclas */}
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <KeyButton key={num} onClick={() => handleInput(num.toString())}>{num}</KeyButton>
                ))}
                <KeyButton variant="delete" onClick={handleDelete}><Delete className="w-8 h-8" /></KeyButton>
                <KeyButton onClick={() => handleInput("0")}>0</KeyButton>
                <KeyButton variant="confirm" onClick={handleConfirm}><Check className="w-10 h-10 stroke-[4px]" /></KeyButton>
            </div>
        </div>
      </div>
    </div>
  );
};
