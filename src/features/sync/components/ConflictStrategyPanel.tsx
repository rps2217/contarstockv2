/**
 * =============================================================================
 * ConflictStrategyPanel - Configuración de Estrategia de Conflictos
 * =============================================================================
 * 
 * Panel para que el usuario configure cómo se resuelven los conflictos
 * de sincronización.
 * 
 * @module ConflictStrategyPanel
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Check, 
  AlertTriangle, 
  ChevronRight,
  Smartphone,
  Cloud,
  Clock,
  User
} from 'lucide-react';
import { 
  ConflictStrategy, 
  CONFLICT_STRATEGIES, 
  getConfiguredStrategy, 
  setConfiguredStrategy 
} from '@/services/cloud/ConflictResolution';
import { toast } from 'sonner';

interface ConflictStrategyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STRATEGY_ICONS = {
  client_wins: Smartphone,
  server_wins: Cloud,
  last_write_wins: Clock,
  manual: User
};

export const ConflictStrategyPanel: React.FC<ConflictStrategyPanelProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictStrategy>('last_write_wins');
  const [isSaving, setIsSaving] = useState(false);

  // Cargar estrategia actual
  useEffect(() => {
    const current = getConfiguredStrategy();
    setSelectedStrategy(current);
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setConfiguredStrategy(selectedStrategy);
      toast.success(`Estrategia "${CONFLICT_STRATEGIES[selectedStrategy].label}" configurada`);
      onClose();
    } catch (e) {
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50"
          >
            <div className="bg-surface rounded-3xl border border-subtle shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-subtle">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 rounded-2xl">
                    <Shield className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Resolución de Conflictos</h2>
                    <p className="text-sm text-muted mt-0.5">
                      Configura cómo resolver conflictos de sincronización
                    </p>
                  </div>
                </div>
              </div>

              {/* Strategies */}
              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {(Object.entries(CONFLICT_STRATEGIES) as [ConflictStrategy, typeof CONFLICT_STRATEGIES[keyof typeof CONFLICT_STRATEGIES]][]).map(([key, config]) => {
                  const Icon = STRATEGY_ICONS[key];
                  const isSelected = selectedStrategy === key;

                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedStrategy(key)}
                      className={`w-full p-4 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
                          : 'bg-elevated/50 border-subtle/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${
                          isSelected ? 'bg-blue-500/20' : 'bg-slate-700/50'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isSelected ? 'text-blue-400' : 'text-muted'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white">{config.label}</h3>
                            {isSelected && (
                              <div className="p-1 bg-blue-500 rounded-full">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted mt-1">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Warning */}
              <div className="px-4 pb-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300">
                    Los cambios se aplican inmediatamente a futuras sincronizaciones.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-subtle flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-elevated text-secondary font-bold text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConflictStrategyPanel;
