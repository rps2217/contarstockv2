
import React, { useState } from 'react';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface ExpirationModalProps {
  onComplete: (mm: number | undefined, yyyy: number | undefined) => void;
  productName: string;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ onComplete, productName }) => {
  const [step, setStep] = useState<'year' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleMonthSelect = (month: number) => {
    onComplete(month, selectedYear);
  };

  const handleSkip = () => {
    onComplete(undefined, undefined);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha Vencimiento</h3>
          <p className="font-bold text-slate-900 text-lg leading-tight line-clamp-2">{productName}</p>
        </div>

        <div className="p-6">
          {step === 'year' ? (
            <div className="space-y-4">
              <p className="text-center text-slate-500 mb-2 text-sm font-medium">Seleccione el AÑO</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleYearSelect(2026)}
                  className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 py-10 rounded-2xl text-3xl font-black transition-all shadow-sm active:scale-95"
                >
                  2026
                </button>
                <button 
                  onClick={() => handleYearSelect(2027)}
                  className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 py-10 rounded-2xl text-3xl font-black transition-all shadow-sm active:scale-95"
                >
                  2027
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <p className="text-slate-500 text-sm font-medium">Seleccione el MES</p>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black">Año {selectedYear}</span>
               </div>
               
               <div className="grid grid-cols-4 gap-3">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                   <button
                    key={m}
                    onClick={() => handleMonthSelect(m)}
                    className="aspect-square flex items-center justify-center bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xl font-bold shadow-sm active:scale-90 transition-all"
                   >
                     {m}
                   </button>
                 ))}
               </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
           <button 
             onClick={handleSkip}
             className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
           >
             Omitir / Sin Fecha
           </button>
           {step === 'month' && (
             <button 
               onClick={() => setStep('year')}
               className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm shadow-sm"
             >
               Volver
             </button>
           )}
        </div>

      </div>
    </div>
  );
};
