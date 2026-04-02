import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Layout, RefreshCw, Trash2 } from 'lucide-react';
import { EventPreferences } from '../hooks/useEventDatabase';
import { CsvImporter } from '../../../src/components/CsvImporter';

interface EventSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: EventPreferences;
  onUpdatePreferences: (prefs: Partial<EventPreferences>) => void;
  onClearLocalData?: () => void;
  theme?: 'dark' | 'light';
}

export const EventSettingsDrawer: React.FC<EventSettingsDrawerProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  onClearLocalData,
  theme = 'dark'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-80 z-[90] shadow-2xl border-l flex flex-col ${
              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Preferencias</h4>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Configuración de Vista</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <CsvImporter />
              {/* SECCIÓN: VISUALIZACIÓN */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-blue-500" />
                  <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Visualización</h5>
                </div>
                <div 
                  onClick={() => onUpdatePreferences({ compactView: !preferences.compactView })}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    preferences.compactView
                      ? 'border-blue-500 bg-blue-500/10'
                      : theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Vista Compacta</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Reduce el espaciado de la lista</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${
                    preferences.compactView ? 'bg-blue-500' : 'bg-slate-700'
                  }`}>
                    <motion.div 
                      animate={{ x: preferences.compactView ? 20 : 2 }}
                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>

                <div 
                  onClick={() => onUpdatePreferences({ showPriorityAssistant: !preferences.showPriorityAssistant })}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    preferences.showPriorityAssistant
                      ? 'border-blue-500 bg-blue-500/10'
                      : theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Asistente de Priorización</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Muestra el panel de alertas y sugerencias</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${
                    preferences.showPriorityAssistant ? 'bg-blue-500' : 'bg-slate-700'
                  }`}>
                    <motion.div 
                      animate={{ x: preferences.showPriorityAssistant ? 20 : 2 }}
                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>
              </section>

              {/* SECCIÓN: SISTEMA */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-rose-500" />
                  <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Sistema</h5>
                </div>
                
                <button
                  onClick={async () => {
                    const { InitializationService } = await import('../../../services/initializationService');
                    await InitializationService.syncConfig();
                    window.location.reload();
                  }}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all mb-2 ${
                    theme === 'dark' ? 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Actualizar desde Nube</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sincronizar configuración desde Firestore</p>
                  </div>
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    theme === 'dark' ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10' : 'border-rose-200 bg-rose-50 hover:bg-rose-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Reiniciar Kernel</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Recargar nuevas características</p>
                  </div>
                </button>

                {onClearLocalData && (
                  <button
                    onClick={async () => {
                      if (confirm("⚠️ ADVERTENCIA ⚠️\n\nEsto eliminará todos los registros locales de EVENTOS. Se volverán a descargar desde la nube en la próxima sincronización.\n\n¿Estás seguro de continuar?")) {
                        await onClearLocalData();
                        const { toast } = await import('sonner');
                        toast.success('Datos locales eliminados. Sincroniza para descargar nuevamente.');
                        onClose();
                      }
                    }}
                    className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all mt-2 ${
                      theme === 'dark' ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-black uppercase tracking-tight ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>Limpiar Datos Locales</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Forzar descarga desde la nube</p>
                    </div>
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    const { firebaseSyncService } = await import('../../../services/firebaseSyncService');
                    const { exportToCSV } = await import('../../../services/export');
                    const result = await firebaseSyncService.pullBatch('EVENTOS');
                    if (result.success) {
                      await exportToCSV(result.rows, 'Eventos_Export');
                    } else {
                      const { toast } = await import('sonner');
                      toast.error('Error al exportar datos');
                    }
                  }}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all mt-2 ${
                    theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Layout className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Exportar a CSV</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Descargar todos los eventos</p>
                  </div>
                </button>
              </section>
            </div>

            <div className="p-6 border-t border-white/5">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center italic">
                Estos ajustes se guardan localmente en tu navegador.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
