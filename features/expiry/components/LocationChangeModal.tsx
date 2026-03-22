
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';

interface LocationChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  locationInput: string;
  setLocationInput: (value: string) => void;
  selectedCount: number;
  theme?: 'dark' | 'light';
}

export const LocationChangeModal: React.FC<LocationChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  locationInput,
  setLocationInput,
  selectedCount,
  theme = 'dark'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border transition-colors ${
              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-50'
              }`}>
                <MapPin className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Cambiar Ubicación</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Actualizando {selectedCount} ítems seleccionados
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                  Nueva Ubicación (Ej: Bodega A, Estante 4)
                </label>
                <input
                  autoFocus
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="INGRESE UBICACIÓN..."
                  className={`w-full border rounded-2xl px-5 py-4 font-black text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase italic tracking-tighter transition-all ${
                    theme === 'dark' ? 'bg-black border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={onClose}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!locationInput.trim()}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
