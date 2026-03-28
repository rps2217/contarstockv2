import React, { useState } from 'react';
import { Calendar, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ExpirationModalProps {
  productName: string;
  onComplete: (month?: number, year?: number, batch?: string) => void;
  onCancel: () => void;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({
  productName,
  onComplete,
  onCancel
}) => {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !year || !lotNumber) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }
    
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    
    if (isNaN(m) || m < 1 || m > 12) {
      setError('Mes inválido (1-12).');
      return;
    }
    
    if (isNaN(y) || y < 2000 || y > 2100) {
      setError('Año inválido.');
      return;
    }

    onComplete(m, y, lotNumber);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div>
            <h3 className="text-amber-500 font-bold uppercase tracking-wider text-sm">Control de Caducidad</h3>
            <p className="text-slate-400 text-xs truncate max-w-[250px]">{productName}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lote</label>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
              placeholder="EJ: L-123456"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mes (MM)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="12"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Año (AAAA)</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="2025"
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm bg-blue-600 text-white hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
