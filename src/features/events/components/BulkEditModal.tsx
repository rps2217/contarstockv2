import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Truck, Hash, FileText, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { destino: string; traspaso: string; observaciones: string }) => Promise<void>;
  theme: 'dark' | 'light';
  selectedCount: number;
}

const DESTINOS = [
  'BOD. 37',
  'BOD. 80',
  'BOD. 95',
  'BOD. 98',
  'BOD. 106',
  'BOD. 121'
];

export const BulkEditModal: React.FC<Props> = ({ isOpen, onClose, onApply, theme, selectedCount }) => {
  const [destino, setDestino] = useState('');
  const [traspaso, setTraspaso] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (traspaso.trim() && !destino.trim()) {
      toast.error('El destino es obligatorio cuando hay un número de traspaso');
      return;
    }

    setIsSubmitting(true);
    try {
      await onApply({ destino, traspaso, observaciones });
      toast.success('Cambios aplicados masivamente');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al aplicar cambios');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-black ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          <div className="bg-black p-6 flex items-center justify-between border-b-4 border-black">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">
                  Edición Masiva
                </h2>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">{selectedCount} ítems seleccionados</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Resumen de cambios</p>
              <p className="text-sm font-bold mt-1">Se aplicarán cambios a <span className="text-blue-500">{selectedCount}</span> registros seleccionados.</p>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Truck className="w-3 h-3" /> Destino {traspaso.trim() && <span className="text-rose-500">*</span>}
              </label>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
                  theme === 'dark'
                    ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                    : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                }`}
              >
                <option value="">Seleccionar destino...</option>
                {DESTINOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Hash className="w-3 h-3" /> Número de Traspaso
              </label>
              <input
                type="text"
                value={traspaso}
                onChange={(e) => setTraspaso(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                  theme === 'dark'
                    ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                    : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <FileText className="w-3 h-3" /> Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                  theme === 'dark'
                    ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                    : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                isSubmitting
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Aplicar Cambios
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

