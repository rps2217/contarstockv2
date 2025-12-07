
import React from 'react';
import { Delete, X } from 'lucide-react';

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
  title,
  embedded = false
}) => {
  
  const handlePress = (val: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onInput(val);
  };

  const handleDeletePress = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.vibrate) navigator.vibrate(20);
    onDelete();
  };

  // --- EMBEDDED MODE (Inside Modal) ---
  if (embedded) {
      if (!isOpen) return null;
      return (
        <div className="w-full bg-slate-100 rounded-2xl p-2 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-3 gap-2 select-none">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => handlePress(num.toString())}
                        className="h-12 md:h-14 lg:h-16 bg-white hover:bg-blue-50 active:bg-blue-100 text-slate-900 text-xl font-black rounded-xl shadow-sm border border-slate-200 border-b-[3px] border-b-slate-300 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center"
                    >
                        {num}
                    </button>
                ))}

                {/* Bottom Row */}
                <button
                    type="button"
                    onClick={() => handlePress("-")}
                    className="h-12 md:h-14 lg:h-16 bg-slate-200 hover:bg-slate-300 active:bg-blue-100 text-slate-800 text-xl font-black rounded-xl shadow-sm border border-slate-300 border-b-[3px] border-b-slate-400 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center"
                >
                    -
                </button>

                <button
                    type="button"
                    onClick={() => handlePress("0")}
                    className="h-12 md:h-14 lg:h-16 bg-white hover:bg-blue-50 active:bg-blue-100 text-slate-900 text-xl font-black rounded-xl shadow-sm border border-slate-200 border-b-[3px] border-b-slate-300 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center"
                >
                    0
                </button>

                <button
                    type="button"
                    onClick={handleDeletePress}
                    className="h-12 md:h-14 lg:h-16 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-600 rounded-xl shadow-sm border border-red-200 border-b-[3px] border-b-red-300 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center"
                >
                    <Delete className="w-6 h-6" />
                </button>
            </div>
        </div>
      );
  }

  // --- OVERLAY MODE (Bottom Sheet - Original) ---
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200`}>
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className={`bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl p-4 w-full max-w-lg mx-auto animate-in slide-in-from-bottom-full duration-300`}>
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6"></div>
        <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">{title || "Teclado"}</span>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 bg-slate-800 rounded-full">
                <X className="w-6 h-6" />
            </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => handlePress(num.toString())} className="h-16 bg-slate-800 text-white text-2xl font-bold rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all">{num}</button>
            ))}
            <button onClick={() => handlePress("-")} className="h-16 bg-slate-800 text-white text-2xl font-bold rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all">-</button>
            <button onClick={() => handlePress("0")} className="h-16 bg-slate-800 text-white text-2xl font-bold rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all">0</button>
            <button onClick={handleDeletePress} className="h-16 bg-slate-800 text-red-400 rounded-2xl shadow-sm border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"><Delete className="w-8 h-8" /></button>
        </div>
      </div>
    </div>
  );
};
