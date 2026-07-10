/**
 * ConflictResolutionModal - UI para resolver conflictos de sincronización
 * 
 * Muestra dos versiones del mismo registro y permite al usuario elegir
 * cuál mantener o fusionar los cambios.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Merge,
  Monitor,
  Smartphone,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ConflictData<T = any> {
  id: string;
  table: string;
  localVersion: T;
  remoteVersion: T;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictingFields: string[];
}

interface ConflictResolutionModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  conflict: ConflictData<T>;
  onResolve: (resolution: 'local' | 'remote' | 'merge', mergedData?: T) => void;
}

export function ConflictResolutionModal<T>({
  isOpen,
  onClose,
  conflict,
  onResolve,
}: ConflictResolutionModalProps<T>) {
  const [selectedOption, setSelectedOption] = useState<'local' | 'remote' | 'merge'>('local');
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set(conflict.conflictingFields));
  const [mergeValues, setMergeValues] = useState<Record<string, any>>({});

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'dd MMM yyyy, HH:mm', { locale: es });
  };

  const toggleField = (field: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedFields(newExpanded);
  };

  const selectMergeValue = (field: string, value: any) => {
    setMergeValues({ ...mergeValues, [field]: value });
    if (!selectedOption || selectedOption === 'local' || selectedOption === 'remote') {
      setSelectedOption('merge');
    }
  };

  const getDisplayValue = (field: string): string => {
    if (selectedOption === 'merge' && mergeValues[field] !== undefined) {
      return String(mergeValues[field]);
    }
    if (selectedOption === 'remote') {
      return String((conflict.remoteVersion as any)[field]);
    }
    return String((conflict.localVersion as any)[field]);
  };

  const handleResolve = () => {
    if (selectedOption === 'merge') {
      const mergedData = {
        ...conflict.localVersion,
        ...conflict.remoteVersion,
        ...mergeValues,
      };
      onResolve('merge', mergedData);
    } else {
      onResolve(selectedOption);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e: any) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Conflicto de Sincronización</h2>
                  <p className="text-xs text-muted mt-0.5">
                    {conflict.table} • ID: {conflict.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4">
                {/* Versión Local */}
                <button
                  onClick={() => setSelectedOption('local')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedOption === 'local'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400 uppercase">Tu Versión</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(conflict.localTimestamp)}
                  </div>
                </button>

                {/* Versión Remota */}
                <button
                  onClick={() => setSelectedOption('remote')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedOption === 'remote'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase">Versión Remota</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(conflict.remoteTimestamp)}
                  </div>
                </button>
              </div>

              {/* Campos en conflicto */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Campos en Conflicto ({conflict.conflictingFields.length})
                </h3>
                
                {conflict.conflictingFields.map((field) => {
                  const isExpanded = expandedFields.has(field);
                  const localVal = (conflict.localVersion as any)[field];
                  const remoteVal = (conflict.remoteVersion as any)[field];
                  const isDifferent = localVal !== remoteVal;

                  if (!isDifferent) return null;

                  return (
                    <div
                      key={field}
                      className="bg-white/5 rounded-xl border border-white/5 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleField(field)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <span className="text-sm font-medium text-white">{field}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            getDisplayValue(field) === String(localVal)
                              ? 'bg-blue-500/20 text-blue-400'
                              : getDisplayValue(field) === String(remoteVal)
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {getDisplayValue(field)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2">
                          {/* Valor Local */}
                          <button
                            onClick={() => {
                              setSelectedOption('local');
                              selectMergeValue(field, localVal);
                            }}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                              selectedOption === 'local' || (selectedOption === 'merge' && mergeValues[field] === localVal)
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Smartphone className="w-3 h-3 text-blue-400" />
                              <span className="text-[10px] font-bold text-blue-400 uppercase">Local</span>
                            </div>
                            <p className="text-sm text-secondary font-mono">{String(localVal)}</p>
                          </button>

                          {/* Valor Remoto */}
                          <button
                            onClick={() => {
                              setSelectedOption('remote');
                              selectMergeValue(field, remoteVal);
                            }}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                              selectedOption === 'remote' || (selectedOption === 'merge' && mergeValues[field] === remoteVal)
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Monitor className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] font-bold text-emerald-400 uppercase">Remoto</span>
                            </div>
                            <p className="text-sm text-secondary font-mono">{String(remoteVal)}</p>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-surface/50 flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleResolve}
                  disabled={!selectedOption}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    selectedOption === 'local'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : selectedOption === 'remote'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-2">
                    {selectedOption === 'merge' && <Merge className="w-4 h-4" />}
                    {selectedOption === 'local' && <Smartphone className="w-4 h-4" />}
                    {selectedOption === 'remote' && <Monitor className="w-4 h-4" />}
                    Usar {selectedOption === 'local' ? 'Local' : selectedOption === 'remote' ? 'Remota' : 'Fusión'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConflictResolutionModal;
