
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Layout, SortAsc, EyeOff, Check, RefreshCw, Zap, Trash2 } from 'lucide-react';
import { ExpiryPreferences } from '../hooks/useExpiryDatabase';
import { CsvImporter } from '../../../components/CsvImporter';

interface ExpirySettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ExpiryPreferences;
  onUpdatePreferences: (prefs: Partial<ExpiryPreferences>) => void;
  onClearLocalData?: () => void;
  theme?: 'dark' | 'light';
}

export const ExpirySettingsDrawer: React.FC<ExpirySettingsDrawerProps> = ({
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
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/40">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Preferencias</h4>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">Configuración de Vista</p>
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
              {/* SECCIÓN: ORDENAMIENTO */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <SortAsc className="w-4 h-4 text-amber-500" />
                  <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Ordenamiento Predeterminado</h5>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onUpdatePreferences({ defaultSort: 'expiry' })}
                    className={`p-4 rounded-xl border text-left transition-all relative group ${
                      preferences.defaultSort === 'expiry'
                        ? 'border-amber-500 bg-amber-500/10'
                        : theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-black uppercase tracking-tight ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>Por Fecha de Vencimiento</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Orden cronológico estándar</p>
                      </div>
                      {preferences.defaultSort === 'expiry' && <Check className="w-4 h-4 text-amber-500" />}
                    </div>
                  </button>

                  <button
                    onClick={() => onUpdatePreferences({ defaultSort: 'withdrawal' })}
                    className={`p-4 rounded-xl border text-left transition-all relative group ${
                      preferences.defaultSort === 'withdrawal'
                        ? 'border-amber-500 bg-amber-500/10'
                        : theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-black uppercase tracking-tight ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>Por Fecha de Retiro</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Prioriza retiros inmediatos</p>
                      </div>
                      {preferences.defaultSort === 'withdrawal' && <Check className="w-4 h-4 text-amber-500" />}
                    </div>
                  </button>
                </div>
              </section>

              {/* SECCIÓN: FILTROS INICIALES */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-500" />
                  <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Filtros al Iniciar</h5>
                </div>
                <div 
                  onClick={() => onUpdatePreferences({ hideExpiredByDefault: !preferences.hideExpiredByDefault })}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    preferences.hideExpiredByDefault
                      ? 'border-amber-500 bg-amber-500/10'
                      : theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Ocultar Expirados</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">No mostrar vencidos al abrir</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${
                    preferences.hideExpiredByDefault ? 'bg-amber-500' : 'bg-slate-700'
                  }`}>
                    <motion.div 
                      animate={{ x: preferences.hideExpiredByDefault ? 20 : 2 }}
                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>
              </section>

              {/* SECCIÓN: VISUALIZACIÓN */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-amber-500" />
                  <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Visualización</h5>
                </div>
                <div 
                  onClick={() => onUpdatePreferences({ compactView: !preferences.compactView })}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    preferences.compactView
                      ? 'border-amber-500 bg-amber-500/10'
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
                    preferences.compactView ? 'bg-amber-500' : 'bg-slate-700'
                  }`}>
                    <motion.div 
                      animate={{ x: preferences.compactView ? 20 : 2 }}
                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>
              </section>

              {/* SECCIÓN: ASISTENTE */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Asistente Inteligente</h5>
                </div>
                <div 
                  onClick={() => onUpdatePreferences({ showPriorityAssistant: !preferences.showPriorityAssistant })}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    preferences.showPriorityAssistant
                      ? 'border-amber-500 bg-amber-500/10'
                      : theme === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Panel de Prioridad</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Mostrar tarjetas de riesgo crítico</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${
                    preferences.showPriorityAssistant ? 'bg-amber-500' : 'bg-slate-700'
                  }`}>
                    <motion.div 
                      animate={{ x: preferences.showPriorityAssistant ? 20 : 2 }}
                      className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>
              </section>

              {/* ENLACE A SETUP GLOBAL */}
              <section className="pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    onClose();
                    window.location.hash = '#/settings?tab=system';
                  }}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    theme === 'dark' ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase tracking-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>Ajustes del Sistema</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sincronización y Kernel Global</p>
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

// Forced GitHub sync
