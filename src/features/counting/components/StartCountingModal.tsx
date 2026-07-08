/**
 * StartCountingModal - Modal unificado para iniciar conteos
 * 
 * Ofrece dos opciones principales:
 * 1. Conteo Ciego (ráfaga) - sin carga teórica
 * 2. Conteo con Carga Teórica - con listado esperado
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, FileText,
  Calendar, Zap, ClipboardList,
  Check, ArrowRight, X, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/shared/components/ui/Modal';
import { Switch } from '@/shared/components/ui/Switch';

// Importar selector de cargas teóricas
import { TheoreticalLoadSelector, type SelectedLoad } from './TheoreticalLoadSelector';

// Tipos
export type CountingMode = 'blind' | 'theoretical';
export type TheoreticalSource = 'local' | 'cloud' | 'stock';

export interface StartCountingConfig {
  mode: CountingMode;
  registerExpiry: boolean;
  theoreticalSource?: TheoreticalSource;
  theoreticalOrderId?: string;
  theoreticalOrderName?: string;
}

interface StartCountingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: StartCountingConfig) => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL - DISEÑO SIMPLIFICADO
// ============================================================================

export const StartCountingModal: React.FC<StartCountingModalProps> = ({
  isOpen,
  onClose,
  onStart
}) => {
  const [mode, setMode] = useState<CountingMode>('blind');
  const [registerExpiry, setRegisterExpiry] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<SelectedLoad | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Resetear estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMode('blind');
        setRegisterExpiry(false);
        setSelectedLoad(null);
        setIsStarting(false);
      }, 300);
    }
  }, [isOpen]);

  const canProceed = mode === 'blind' || (mode === 'theoretical' && selectedLoad !== null);

  const handleStart = useCallback(async () => {
    if (!canProceed || isStarting) return;

    setIsStarting(true);
    
    const config: StartCountingConfig = {
      mode,
      registerExpiry: mode === 'blind' ? registerExpiry : true,
      theoreticalSource: mode === 'theoretical' ? selectedLoad?.source : undefined,
      theoreticalOrderId: mode === 'theoretical' ? selectedLoad?.id : undefined,
      theoreticalOrderName: mode === 'theoretical' ? selectedLoad?.name : undefined,
    };

    try {
      // Cerrar modal primero
      onClose();
      // Pequeño delay para que el modal se cierre visualmente
      await new Promise(resolve => setTimeout(resolve, 100));
      // Luego iniciar el conteo (que puede incluir navegación)
      await onStart(config);
    } catch (error) {
      console.error('Error starting counting:', error);
      setIsStarting(false);
    }
  }, [canProceed, isStarting, mode, registerExpiry, selectedLoad, onClose, onStart]);

  const getButtonText = () => {
    if (isStarting) return 'Iniciando...';
    if (mode === 'blind') {
      return registerExpiry ? 'Iniciar con vencimiento' : 'Iniciar conteo';
    }
    return selectedLoad ? `Iniciar con "${selectedLoad.name}"` : 'Selecciona una carga';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Conteo"
      variant="center"
      size="xl"
      className="bg-base max-w-3xl"
    >
      <div className="space-y-6">
        {/* Descripción */}
        <p className="text-center text-secondary">
          Selecciona el tipo de conteo que deseas realizar
        </p>

        {/* Opciones principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Conteo Ciego */}
          <button
            onClick={() => setMode('blind')}
            className={cn(
              'relative p-6 rounded-2xl border-2 text-left transition-all duration-200',
              'hover:scale-[1.01] active:scale-[0.99]',
              mode === 'blind'
                ? 'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20'
                : 'bg-surface border-subtle hover:border-blue-500/30 hover:bg-elevated'
            )}
          >
            {mode === 'blind' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
                mode === 'blind' ? 'bg-blue-500/20' : 'bg-blue-500/10'
              )}>
                <EyeOff className={cn('w-7 h-7', mode === 'blind' ? 'text-blue-400' : 'text-blue-400/60')} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn('text-lg font-bold', mode === 'blind' ? 'text-blue-400' : 'text-primary')}>
                    Conteo Ciego
                  </h3>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    mode === 'blind' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
                  )}>
                    Rápido
                  </span>
                </div>
                <p className="text-sm text-secondary">
                  Sin carga teórica. Ideal para inventarios generales o conteos ráfaga.
                </p>
              </div>
            </div>

            {/* Características */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-elevated rounded-lg text-xs text-muted">
                <Zap className="w-3 h-3" /> Sin listado
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-elevated rounded-lg text-xs text-muted">
                <Eye className="w-3 h-3" /> Escaneo rápido
              </span>
            </div>
          </button>

          {/* Con Carga Teórica */}
          <button
            onClick={() => setMode('theoretical')}
            className={cn(
              'relative p-6 rounded-2xl border-2 text-left transition-all duration-200',
              'hover:scale-[1.01] active:scale-[0.99]',
              mode === 'theoretical'
                ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20'
                : 'bg-surface border-subtle hover:border-amber-500/30 hover:bg-elevated'
            )}
          >
            {mode === 'theoretical' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
                mode === 'theoretical' ? 'bg-amber-500/20' : 'bg-amber-500/10'
              )}>
                <FileText className={cn('w-7 h-7', mode === 'theoretical' ? 'text-amber-400' : 'text-amber-400/60')} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn('text-lg font-bold', mode === 'theoretical' ? 'text-amber-400' : 'text-primary')}>
                    Con Carga Teórica
                  </h3>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    mode === 'theoretical' ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-400'
                  )}>
                    Preciso
                  </span>
                </div>
                <p className="text-sm text-secondary">
                  Comparar contra listado esperado. Muestra diferencias en tiempo real.
                </p>
              </div>
            </div>

            {/* Características */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-elevated rounded-lg text-xs text-muted">
                <ClipboardList className="w-3 h-3" /> Con listado
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-elevated rounded-lg text-xs text-muted">
                <Calendar className="w-3 h-3" /> Requiere vencimiento
              </span>
            </div>
          </button>
        </div>

        {/* Opciones específicas por modo */}
        <AnimatePresence mode="wait">
          {mode === 'blind' && (
            <motion.div
              key="blind-options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-surface border border-subtle rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">Registrar vencimiento</p>
                      <p className="text-xs text-secondary">
                        Solicitar fecha de caducidad (mm/yyyy) al escanear
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={registerExpiry}
                    onChange={setRegisterExpiry}
                    size="lg"
                  />
                </div>
                {registerExpiry && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      <span>ℹ️</span>
                      Cada escaneo mostrará un campo para registrar el mes y año de vencimiento.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {mode === 'theoretical' && (
            <motion.div
              key="theoretical-options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-primary">Conteo con Carga Teórica</h3>
                      <p className="text-xs text-secondary mt-1">
                        Se compararán los escaneos contra el listado esperado.
                        Se requerirá registro de fecha de vencimiento.
                      </p>
                    </div>
                  </div>
                </div>
                <TheoreticalLoadSelector
                  selectedLoad={selectedLoad}
                  onSelectLoad={setSelectedLoad}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4 border-t border-subtle">
          <button
            onClick={onClose}
            className="px-5 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors"
            disabled={isStarting}
          >
            Cancelar
          </button>
          <button
            onClick={handleStart}
            disabled={!canProceed || isStarting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all',
              canProceed && !isStarting
                ? 'bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-white shadow-lg shadow-blue-500/30'
                : 'bg-elevated text-muted cursor-not-allowed'
            )}
          >
            {isStarting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Iniciando...
              </>
            ) : (
              <>
                {mode === 'blind' ? <Eye className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                {getButtonText()}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StartCountingModal;
