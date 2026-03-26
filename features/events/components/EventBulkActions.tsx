import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckSquare, 
  Trash2, 
  X, 
  Printer, 
  Mail, 
  Truck,
  Search
} from 'lucide-react';

interface EventBulkActionsProps {
  selectedCount: number;
  totalVisibleCount: number;
  onClearSelection: () => void;
  onSelectAllVisible: () => void;
  onBulkRemove: () => void;
  onBulkPrintLabels: () => void;
  onBulkSendEmail: () => void;
  onOpenBulkEdit: () => void;
  onBulkSearchDocument: () => void;
  theme?: 'dark' | 'light';
}

export const EventBulkActions: React.FC<EventBulkActionsProps> = ({
  selectedCount,
  totalVisibleCount,
  onClearSelection,
  onSelectAllVisible,
  onBulkRemove,
  onBulkPrintLabels,
  onBulkSendEmail,
  onOpenBulkEdit,
  onBulkSearchDocument,
  theme = 'dark'
}) => {
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
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Acciones Masivas</h4>
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

            <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>Selección</p>
                
                <button
                  onClick={onSelectAllVisible}
                  className={`w-full px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  Seleccionar Todos ({totalVisibleCount})
                </button>
              </div>

              <div className={`h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

              <div className="space-y-4">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>Gestión de Documentos</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={onBulkPrintLabels}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Etiquetas
                  </button>

                  <button
                    onClick={onBulkSearchDocument}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Search className="w-4 h-4" />
                    Buscar Documento
                  </button>

                  <button
                    onClick={onBulkSendEmail}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <Mail className="w-4 h-4" />
                    Enviar por Correo
                  </button>
                </div>
              </div>

              <div className={`h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

              <div className="space-y-4">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>Edición</p>
                
                <button
                  onClick={onOpenBulkEdit}
                  className={`w-full px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border ${
                    theme === 'dark'
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Editar Detalles Masivos
                </button>
              </div>

              <div className={`h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

              <div className="space-y-4">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>Peligro</p>
                
                <button
                  onClick={onBulkRemove}
                  className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Registros
                </button>
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
