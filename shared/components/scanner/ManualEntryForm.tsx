import React from 'react';
import { X } from 'lucide-react';

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
    <div className="p-6 bg-slate-900 border-b border-white/10 flex flex-col items-center justify-center pt-12">
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
        className="w-full max-w-sm flex flex-col gap-6"
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Ingresa el código aquí"
          className="w-full bg-transparent border-b-2 border-rose-500 text-center text-2xl text-white py-2 focus:outline-none placeholder:text-slate-500 font-mono"
        />
        <div className="flex justify-center gap-4">
          <button 
            type="button"
            onClick={() => setManualInput('')}
            className="w-12 h-12 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/50 active:bg-rose-500/40 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <button 
            type="submit"
            disabled={!manualInput.trim()}
            className="flex-1 h-12 rounded-lg bg-rose-600 text-white font-bold tracking-wider active:bg-rose-700 disabled:opacity-50 disabled:active:bg-rose-600 transition-colors"
          >
            INGRESAR
          </button>
        </div>
      </form>
    </div>
  );
};
