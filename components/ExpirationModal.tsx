
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Tag, CheckCircle2, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface ExpirationModalProps {
  onComplete: (mm?: number, yyyy?: number, batch?: string) => void;
  productName: string;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ onComplete, productName }) => {
  const [step, setStep] = useState<'batch' | 'year' | 'month'>('batch');
  const [batch, setBatch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [remember, setRemember] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (step === 'batch') setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  const handleBatchSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!batch.trim()) return;
      setStep('year');
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleMonthSelect = (month: number) => {
    onComplete(month, selectedYear, batch.trim().toUpperCase());
  };

  const handleSkip = () => {
    onComplete(undefined, undefined, batch.trim().toUpperCase() || 'SIN_LOTE');
  };

  return (
    <div className="fixed inset-0 z-[400] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
        
        <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
          <div className="mx-auto w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            {step === 'batch' ? <Tag className="w-7 h-7" /> : <Calendar className="w-7 h-7" />}
          </div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Validación Pharma</h3>
          <p className="font-black text-slate-900 text-lg leading-tight uppercase truncate">{productName}</p>
        </div>

        <div className="p-6">
          {step === 'batch' && (
            <form onSubmit={handleBatchSubmit} className="space-y-4 animate-in slide-in-from-right-4">
                <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Ingrese Número de LOTE</p>
                <input 
                    ref={inputRef}
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="Ej: L230401..."
                    className="w-full h-16 bg-slate-50 border-4 border-slate-100 rounded-2xl text-center text-2xl font-black uppercase tracking-widest text-slate-900 outline-none focus:border-indigo-500 transition-all"
                />
                <button 
                    disabled={!batch.trim()}
                    className="w-full h-14 bg-indigo-600 disabled:opacity-30 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                    Siguiente <ArrowRight className="w-5 h-5" />
                </button>
            </form>
          )}

          {step === 'year' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 text-center">
              <div className="bg-indigo-50 text-indigo-700 py-2 px-4 rounded-full inline-block text-[10px] font-black uppercase mb-2">LOTE: {batch}</div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Seleccione Año Vencimiento</p>
              <div className="grid grid-cols-2 gap-3">
                {[2025, 2026, 2027, 2028].map(y => (
                    <button key={y} onClick={() => handleYearSelect(y)} className="h-16 bg-white border-2 border-slate-100 rounded-xl font-black text-xl text-slate-700 hover:border-indigo-500 active:scale-95 transition-all">{y}</button>
                ))}
              </div>
            </div>
          )}

          {step === 'month' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
               <div className="flex items-center justify-between px-2 mb-2">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Mes Venc.</p>
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black">AÑO {selectedYear}</span>
               </div>
               <div className="grid grid-cols-4 gap-2">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                   <button key={m} onClick={() => handleMonthSelect(m)} className="aspect-square flex items-center justify-center bg-white border-2 border-slate-100 rounded-xl font-black text-lg text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 active:scale-90 transition-all">{m}</button>
                 ))}
               </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
           <button onClick={handleSkip} className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest">Sin Fecha</button>
           {step !== 'batch' && <button onClick={() => setStep(step === 'month' ? 'year' : 'batch')} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-xs uppercase shadow-sm">Volver</button>}
        </div>
      </div>
    </div>
  );
};
