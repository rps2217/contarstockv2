/**
 * StartCountingModal - Modal unificado para iniciar conteos
 * 
 * Diseño completamente responsivo:
 * - Full-screen en móvil (< 640px)
 * - Modal centrado en desktop (≥ 640px)
 * - Stepper visual para guiar al usuario
 * - Cards adaptativas con mejor área táctil
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, FileText,
  Calendar, Zap, ClipboardList,
  Check, ArrowRight, X, ChevronRight,
  Smartphone, Monitor, Zap as ZapIcon, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
// ANIMACIONES
// ============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modalVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 }
  },
  exit: { 
    opacity: 0, 
    y: 20, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.3 }
  })
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const StartCountingModal: React.FC<StartCountingModalProps> = ({
  isOpen,
  onClose,
  onStart
}) => {
  const [mode, setMode] = useState<CountingMode>('blind');
  const [step, setStep] = useState<1 | 2>(1);
  const [registerExpiry, setRegisterExpiry] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<SelectedLoad | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Resetear estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMode('blind');
        setStep(1);
        setRegisterExpiry(false);
        setSelectedLoad(null);
        setIsStarting(false);
      }, 300);
    }
  }, [isOpen]);

  const canProceed = mode === 'blind' || (mode === 'theoretical' && selectedLoad !== null);

  const handleSelectMode = (newMode: CountingMode) => {
    setMode(newMode);
    // Avanzar al paso 2 después de un pequeño delay para la animación
    setTimeout(() => setStep(2), 150);
  };

  const handleBack = () => {
    setStep(1);
  };

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
      onClose();
      await new Promise(resolve => setTimeout(resolve, 100));
      await onStart(config);
    } catch (error) {
      console.error('Error starting counting:', error);
      setIsStarting(false);
    }
  }, [canProceed, isStarting, mode, registerExpiry, selectedLoad, onClose, onStart]);

  const getButtonText = () => {
    if (isStarting) return 'Iniciando...';
    if (mode === 'blind') {
      return registerExpiry ? 'Iniciar con vencimiento' : 'Iniciar conteo ciego';
    }
    return selectedLoad ? `Iniciar con "${selectedLoad.name}"` : 'Selecciona una carga';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            key="modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative w-full bg-base rounded-2xl overflow-hidden shadow-2xl',
              'max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col',
              'max-h-[calc(100vh-8rem)]' // Account for dock (4rem) + safe area + padding
            )}
          >
            {/* Header */}
            <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Step indicator */}
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      step === 1 ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                    )}>
                      {step === 1 ? '1' : <Check className="w-4 h-4" />}
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <div className={cn('w-2 h-2 rounded-full', step === 2 ? 'bg-emerald-500' : 'bg-subtle')} />
                      <div className={cn('w-6 h-0.5 rounded', step === 2 ? 'bg-emerald-500' : 'bg-subtle')} />
                    </div>
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      step === 2 ? 'bg-emerald-500 text-white' : 'bg-surface text-muted'
                    )}>
                      2
                    </div>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-primary">
                    {step === 1 ? 'Nuevo Conteo' : mode === 'blind' ? 'Configurar' : 'Seleccionar Carga'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-surface transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
              
              {/* Step labels */}
              <div className="flex gap-4 mt-2 text-xs text-muted">
                <span className={step === 1 ? 'text-primary' : ''}>Elegir tipo</span>
                <span className={step === 2 ? 'text-primary' : ''}>Configurar</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {/* PASO 1: Elegir tipo de conteo */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <p className="text-center text-secondary text-sm mb-6">
                      ¿Qué tipo de conteo deseas realizar?
                    </p>

                    {/* Cards de selección */}
                    <motion.button
                      custom={0}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleSelectMode('blind')}
                      className={cn(
                        'w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200',
                        'active:scale-[0.98] min-h-[100px]',
                        mode === 'blind'
                          ? 'bg-blue-500/15 border-blue-500 shadow-lg shadow-blue-500/20'
                          : 'bg-surface border-subtle hover:border-blue-500/50 hover:bg-surface/80'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10">
                          <EyeOff className={cn('w-6 h-6 sm:w-7 sm:h-7', mode === 'blind' ? 'text-blue-400' : 'text-blue-400/60')} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className={cn(
                              'text-base sm:text-lg font-bold',
                              mode === 'blind' ? 'text-blue-400' : 'text-primary'
                            )}>
                              Conteo Ciego
                            </h3>
                            <span className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              mode === 'blind' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
                            )}>
                              Rápido
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-secondary">
                            Sin carga teórica. Escaneo rápido sin comparaciones.
                          </p>
                          
                          {/* Features */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <FeatureBadge icon={<ZapIcon className="w-3 h-3" />} text="Sin listado" />
                            <FeatureBadge icon={<Hash className="w-3 h-3" />} text="Conteo ráfaga" />
                            <FeatureBadge icon={<Smartphone className="w-3 h-3" />} text="Móvil" />
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className={cn(
                          'w-5 h-5 shrink-0 mt-1',
                          mode === 'blind' ? 'text-blue-400' : 'text-muted'
                        )} />
                      </div>
                    </motion.button>

                    <motion.button
                      custom={1}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleSelectMode('theoretical')}
                      className={cn(
                        'w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200',
                        'active:scale-[0.98] min-h-[100px]',
                        mode === 'theoretical'
                          ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20'
                          : 'bg-surface border-subtle hover:border-amber-500/50 hover:bg-surface/80'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10">
                          <FileText className={cn('w-6 h-6 sm:w-7 sm:h-7', mode === 'theoretical' ? 'text-amber-400' : 'text-amber-400/60')} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className={cn(
                              'text-base sm:text-lg font-bold',
                              mode === 'theoretical' ? 'text-amber-400' : 'text-primary'
                            )}>
                              Con Carga Teórica
                            </h3>
                            <span className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              mode === 'theoretical' ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-400'
                            )}>
                              Preciso
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-secondary">
                            Comparar contra listado esperado. Diferencias en tiempo real.
                          </p>
                          
                          {/* Features */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <FeatureBadge icon={<ClipboardList className="w-3 h-3" />} text="Con listado" />
                            <FeatureBadge icon={<Calendar className="w-3 h-3" />} text="Vencimiento" />
                            <FeatureBadge icon={<Monitor className="w-3 h-3" />} text="Desktop" />
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className={cn(
                          'w-5 h-5 shrink-0 mt-1',
                          mode === 'theoretical' ? 'text-amber-400' : 'text-muted'
                        )} />
                      </div>
                    </motion.button>
                  </motion.div>
                )}

                {/* PASO 2: Configurar opciones */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Resumen de selección */}
                    <div className={cn(
                      'p-3 rounded-xl border flex items-center gap-3',
                      mode === 'blind' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30'
                    )}>
                      {mode === 'blind' ? (
                        <EyeOff className="w-5 h-5 shrink-0 text-blue-400" />
                      ) : (
                        <FileText className="w-5 h-5 shrink-0 text-amber-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary">
                          {mode === 'blind' ? 'Conteo Ciego' : 'Conteo con Carga Teórica'}
                        </p>
                        <p className="text-xs text-muted">
                          {mode === 'blind' 
                            ? 'Sin comparación, escaneo directo' 
                            : 'Listado cargado, listo para comparar'}
                        </p>
                      </div>
                      <button
                        onClick={handleBack}
                        className="text-xs text-muted hover:text-primary transition-colors"
                      >
                        Cambiar
                      </button>
                    </div>

                    {/* Opciones específicas */}
                    {mode === 'blind' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-surface rounded-xl border border-subtle">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-amber-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-primary">Registrar vencimiento</p>
                                <p className="text-xs text-secondary">
                                  Solicitar mm/yyyy al escanear
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={registerExpiry}
                              onChange={setRegisterExpiry}
                              size="md"
                            />
                          </div>
                        </div>
                        
                        {registerExpiry && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                          >
                            <p className="text-xs text-amber-400">
                              📅 Cada escaneo mostrará un campo para registrar el mes y año de vencimiento del producto.
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {mode === 'theoretical' && (
                      <div className="space-y-4">
                        <TheoreticalLoadSelector
                          selectedLoad={selectedLoad}
                          onSelectLoad={setSelectedLoad}
                          compact={false}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 sm:p-6 pb-safe border-t border-subtle bg-surface/50">
              <div className="flex gap-3">
                {step === 2 && (
                  <button
                    onClick={handleBack}
                    className="px-5 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span className="hidden sm:inline">Volver</span>
                  </button>
                )}
                <button
                  onClick={handleStart}
                  disabled={!canProceed || isStarting}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all',
                    canProceed && !isStarting
                      ? mode === 'blind'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white shadow-lg shadow-amber-500/30'
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const FeatureBadge = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-elevated rounded-lg text-xs text-muted">
    {icon}
    <span className="hidden xs:inline">{text}</span>
  </span>
);

export default StartCountingModal;
