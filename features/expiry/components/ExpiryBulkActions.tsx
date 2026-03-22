
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Trash2, MapPin, X } from 'lucide-react';

interface ExpiryBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkRemove: () => void;
  onBulkChangeLocation: () => void;
  theme?: 'dark' | 'light';
}

export const ExpiryBulkActions: React.FC<ExpiryBulkActionsProps> = ({
  selectedCount,
  onClearSelection,
  onBulkRemove,
  onBulkChangeLocation,
  theme = 'dark'
}) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        >
          <div className={`border rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl transition-colors ${
            theme === 'dark' ? 'bg-slate-900 border-indigo-500/50 shadow-indigo-500/20' : 'bg-white border-indigo-200 shadow-indigo-500/10'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Acciones Masivas</h4>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">{selectedCount} Ítems seleccionados</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onBulkChangeLocation}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                  theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-white border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Cambiar Ubicación
              </button>
              <button
                onClick={onBulkRemove}
                className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Retirar Todo
              </button>
              <div className={`w-px h-8 mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`} />
              <button
                onClick={onClearSelection}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
