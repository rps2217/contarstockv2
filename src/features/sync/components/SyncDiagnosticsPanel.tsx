import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, History, Trash2, X, RefreshCw, Layers } from 'lucide-react';
import { useSyncStore } from '@/stores';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface SyncDiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDiagnosticsPanel: React.FC<SyncDiagnosticsPanelProps> = ({ isOpen, onClose }) => {
  const { incidents, conflicts, clearIncidents } = useSyncStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-xl bg-surface border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-elevated/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">
                    Diagnóstico de Red
                  </h2>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                    Estado de Sincronización
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* RESUMEN DE CONFLICTOS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Conflictos
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">{conflicts}</div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                    Fusiones automáticas realizadas
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${incidents.length > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}
                >
                  <div
                    className={`flex items-center gap-2 mb-1 ${incidents.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                  >
                    {incidents.length > 0 ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Incidentes
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-black ${incidents.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}
                  >
                    {incidents.length}
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                    Errores de escritura pendientes
                  </p>
                </div>
              </div>

              {/* LISTA DE INCIDENTES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Historial de Incidentes
                  </span>
                  {incidents.length > 0 && (
                    <button
                      onClick={clearIncidents}
                      className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>

                {incidents.length === 0 ? (
                  <div className="p-8 text-center bg-base/30 rounded-2xl border border-dashed border-white/5">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Sin errores registrados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incidents.map((incident, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-base/50 border border-white/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-rose-500 uppercase bg-rose-500/10 px-1.5 py-0.5 rounded">
                              {incident.table}
                            </span>
                            <p className="text-xs text-white font-medium mt-2 leading-relaxed">
                              {incident.error}
                            </p>
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 whitespace-nowrap">
                            {format(incident.time, 'HH:mm:ss', { locale: es })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-elevated/30 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
