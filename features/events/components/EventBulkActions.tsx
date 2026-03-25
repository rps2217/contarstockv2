import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Trash2, X, CheckCircle2, Undo2, Truck } from 'lucide-react';

interface EventBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkRemove: () => void;
  onBulkUpdateStatus: (isAdjusted: boolean) => void;
  onBulkUpdateDestino: (destino: string) => void;
  theme?: 'dark' | 'light';
}

export const EventBulkActions: React.FC<EventBulkActionsProps> = ({
  selectedCount,
  onClearSelection,
  onBulkRemove,
  onBulkUpdateStatus,
  onBulkUpdateDestino,
  theme = 'dark'
}) => {
  const DESTINOS = [
    'BOD. 37',
    'BOD. 80',
    'BOD. 95',
    'BOD. 98',
    'BOD. 106',
    'BOD. 121'
  ];
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <>
          {/* Side Menu (Non-blocking) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-80 z-[70] shadow-2xl border-l flex flex-col pointer-events-auto ${
              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-6 flex items-center justify-between border-bottom border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Acciones</h4>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">{selectedCount} Seleccionados</p>
                </div>
              </div>
              <button
                onClick={onClearSelection}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4">
              <div className={`p-4 rounded-2xl border ${
                theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>Operaciones Disponibles</p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => onBulkUpdateStatus(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Marcar como Ajustados
                  </button>

                  <button
                    onClick={() => onBulkUpdateStatus(false)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-amber-500/20"
                  >
                    <Undo2 className="w-4 h-4" />
                    Revertir a Pendientes
                  </button>

                  <div className={`h-px my-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

                  <button
                    onClick={onBulkRemove}
                    className="w-full bg-rose-500 hover:bg-rose-400 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Retirar Seleccionados
                  </button>

                  <div className={`h-px my-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

                  <div className="space-y-2">
                    <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      <Truck className="w-3 h-3" /> Cambiar Destino
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {DESTINOS.map(d => (
                        <button
                          key={d}
                          onClick={() => onBulkUpdateDestino(d)}
                          className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                            theme === 'dark'
                              ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border border-dashed ${
                theme === 'dark' ? 'border-white/10' : 'border-slate-200'
              }`}>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center italic">
                  Próximamente más acciones masivas aquí...
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-white/5">
              <button
                onClick={onClearSelection}
                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' 
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                Cancelar Selección
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
