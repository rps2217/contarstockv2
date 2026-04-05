import React from 'react';
import { X, Check } from 'lucide-react';

interface ManualEntryFormProps {
  manualInput: string;
  setManualInput: (value: string) => void;
  onSubmit: (code: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({
  manualInput,
  setManualInput,
  onSubmit,
  inputRef
}) => {
  return (
    <div className="p-6 bg-slate-900 border-b border-white/10 flex flex-col items-center justify-center pt-8 pb-10">
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (manualInput.trim()) {
            onSubmit(manualInput.trim());
            setManualInput('');
            // Keep focus after scanning
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }}
        className="w-full max-w-md flex flex-col gap-8"
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="0000000000"
            className="w-full bg-black/50 border-4 border-rose-500/50 rounded-3xl text-center text-5xl text-white py-6 focus:outline-none focus:border-rose-500 placeholder:text-slate-700 font-mono tracking-widest shadow-inner"
          />
          {manualInput && (
            <button 
              type="button"
              onClick={() => setManualInput('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <button 
          type="submit"
          disabled={!manualInput.trim()}
          className="w-full h-24 rounded-[2rem] bg-rose-600 text-white font-black text-2xl tracking-[0.2em] uppercase active:bg-rose-700 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all shadow-[0_10px_30px_rgba(225,29,72,0.4)] flex items-center justify-center gap-4"
        >
          <Check className="w-8 h-8" />
          REGISTRAR
        </button>
      </form>
    </div>
  );
};

// Forced GitHub sync
