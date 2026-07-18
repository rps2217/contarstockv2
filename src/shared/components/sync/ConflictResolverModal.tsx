'use client';
/**
 * ConflictResolverModal - UI para resolver conflictos de sincronización
 *
 * Muestra los datos locales y remotos en paralelo,
 * permitiendo al usuario decidir cuál preservar o hacer merge.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Monitor,
  Cloud,
  GitMerge,
  Check,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConflictStore, ConflictRecord } from '@/stores';
import { toast } from 'sonner';
import { formatDetailDateTime } from '@/lib/date';

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { getActiveConflict, resolveConflict, dismissConflict, pendingCount } = useConflictStore();

  const [conflict, setConflict] = useState<ConflictRecord | null>(null);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveConflict();
      setConflict(active);
      setExpandedFields(new Set());
    }
  }, [isOpen, getActiveConflict]);

  if (!conflict) return null;

  // Obtener las keys que difieren entre local y remote
  const getDifferingFields = (): string[] => {
    const allKeys = new Set([
      ...Object.keys(conflict.localData),
      ...Object.keys(conflict.remoteData),
    ]);

    return Array.from(allKeys).filter(key => {
      if (key.startsWith('_') || key === 'id' || key === 'syncStatus') return false;
      const localVal = JSON.stringify(conflict.localData[key]);
      const remoteVal = JSON.stringify(conflict.remoteData[key]);
      return localVal !== remoteVal;
    });
  };

  const toggleField = (field: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleResolve = async (resolution: 'local' | 'remote' | 'merged') => {
    setIsResolving(true);
    try {
      resolveConflict(conflict.id, resolution);

      const messages = {
        local: 'Se preservaron los cambios locales',
        remote: 'Se aplicaron los cambios del servidor',
        merged: 'Se combinaron ambos cambios',
      };

      toast.success('Conflicto resuelto', {
        description: messages[resolution],
      });

      // Ir al siguiente conflicto
      const next = getActiveConflict();
      setConflict(next);

      if (!next) {
        onClose();
      }
    } finally {
      setIsResolving(false);
    }
  };

  const differingFields = getDifferingFields();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[85vh] z-[9999] flex flex-col"
          >
            <div className="bg-surface border border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-subtle bg-elevated/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-primary">
                      Resolver Conflicto de Sincronización
                    </h2>
                    <p className="text-sm text-muted">
                      {pendingCount()} conflicto{pendingCount() !== 1 ? 's' : ''} pendiente
                      {pendingCount() !== 1 ? 's' : ''} • Tabla: {conflict.table}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissConflict(conflict.id)}
                  className="p-2 text-muted hover:text-primary hover:bg-elevated rounded-xl transition-colors"
                  title="Descartar conflicto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Info del registro */}
                <div className="bg-base/50 rounded-xl p-4 border border-subtle">
                  <p className="text-sm text-muted mb-1">ID del registro</p>
                  <p className="text-primary font-mono font-medium">{conflict.recordId}</p>
                </div>

                {/* Comparación lado a lado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Versión Local */}
                  <div className="border border-blue-500/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-blue-500/10 border-b border-blue-500/30">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold text-blue-400">Versión Local</span>
                      </div>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDetailDateTime(conflict.localTimestamp)}
                      </span>
                    </div>
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(conflict.localData).map(([key, value]) => {
                        const isDifferent = differingFields.includes(key);
                        return (
                          <div
                            key={key}
                            className={cn(
                              'text-sm p-2 rounded-lg',
                              isDifferent
                                ? 'bg-blue-500/10 border border-blue-500/30'
                                : 'bg-elevated/50'
                            )}
                          >
                            <p className="text-muted text-xs mb-1">{key}</p>
                            <p
                              className={cn(
                                'font-medium break-all',
                                isDifferent ? 'text-blue-400' : 'text-primary'
                              )}
                            >
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value ?? '')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 border-t border-blue-500/30">
                      <button
                        onClick={() => handleResolve('local')}
                        disabled={isResolving}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all',
                          'bg-blue-600 hover:bg-blue-500 text-white',
                          isResolving && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Monitor className="w-4 h-4" />
                        Usar Versión Local
                      </button>
                    </div>
                  </div>

                  {/* Versión Remota */}
                  <div className="border border-emerald-500/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-emerald-500/10 border-b border-emerald-500/30">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-emerald-400">Versión Remota</span>
                      </div>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDetailDateTime(conflict.remoteTimestamp)}
                      </span>
                    </div>
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(conflict.remoteData).map(([key, value]) => {
                        const isDifferent = differingFields.includes(key);
                        return (
                          <div
                            key={key}
                            className={cn(
                              'text-sm p-2 rounded-lg',
                              isDifferent
                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                : 'bg-elevated/50'
                            )}
                          >
                            <p className="text-muted text-xs mb-1">{key}</p>
                            <p
                              className={cn(
                                'font-medium break-all',
                                isDifferent ? 'text-emerald-400' : 'text-primary'
                              )}
                            >
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value ?? '')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 border-t border-emerald-500/30">
                      <button
                        onClick={() => handleResolve('remote')}
                        disabled={isResolving}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all',
                          'bg-emerald-600 hover:bg-emerald-500 text-white',
                          isResolving && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Cloud className="w-4 h-4" />
                        Usar Versión Remota
                      </button>
                    </div>
                  </div>
                </div>

                {/* Diferencias expandibles */}
                {differingFields.length > 0 && (
                  <div className="border border-subtle rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleField('__all__')}
                      className="w-full flex items-center justify-between p-3 hover:bg-elevated/50 transition-colors"
                    >
                      <span className="font-medium text-primary flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Campos que difieren ({differingFields.length})
                      </span>
                      {expandedFields.has('__all__') ? (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedFields.has('__all__') && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 space-y-2">
                            {differingFields.map(field => (
                              <div
                                key={field}
                                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
                              >
                                <p className="text-xs text-amber-500 mb-2 font-semibold">
                                  📌 {field}
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div className="bg-blue-500/10 rounded p-2">
                                    <p className="text-muted mb-1">Local:</p>
                                    <p className="text-primary font-medium">
                                      {typeof conflict.localData[field] === 'object'
                                        ? JSON.stringify(conflict.localData[field])
                                        : String(conflict.localData[field] ?? '(vacío)')}
                                    </p>
                                  </div>
                                  <div className="bg-emerald-500/10 rounded p-2">
                                    <p className="text-muted mb-1">Remoto:</p>
                                    <p className="text-primary font-medium">
                                      {typeof conflict.remoteData[field] === 'object'
                                        ? JSON.stringify(conflict.remoteData[field])
                                        : String(conflict.remoteData[field] ?? '(vacío)')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Info adicional */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-500 mb-1">
                        ¿Por qué ocurre esto?
                      </p>
                      <p className="text-xs text-secondary leading-relaxed">
                        Este registro fue modificado tanto en este dispositivo como en la nube por
                        otro usuario o sesión. Selecciona cuál versión deseas conservar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-subtle bg-elevated/50">
                <p className="text-xs text-muted">
                  Detectado: {formatDetailDateTime(conflict.detectedAt)}
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Componente para integración en App
export const ConflictResolverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pendingCount = useConflictStore(state => state.pendingConflicts.length);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-conflict-resolver', handleOpen);
    return () => window.removeEventListener('open-conflict-resolver', handleOpen);
  }, []);

  return (
    <>
      {children}
      <ConflictResolverModal isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* Notification cuando hay conflictos pendientes */}
      {pendingCount > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl shadow-lg hover:bg-amber-400 transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">
            {pendingCount} conflicto{pendingCount !== 1 ? 's' : ''}
          </span>
        </button>
      )}
    </>
  );
};

export default ConflictResolverModal;
