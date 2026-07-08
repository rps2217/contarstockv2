/**
 * StartCountingModal - Modal unificado para iniciar conteos
 * 
 * Ofrece dos opciones principales:
 * 1. Conteo Ciego (ráfaga) - sin carga teórica
 * 2. Conteo con Carga Teórica - con listado esperado
 * 
 * Usa TheoreticalLoadSelector para la selección de cargas.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, FileText,
  Calendar,
  Check, ArrowRight
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
// COMPONENTE PRINCIPAL
// ============================================================================

export const StartCountingModal: React.FC<StartCountingModalProps> = ({
  isOpen,
  onClose,
  onStart
}) => {
  const [step, setStep] = useState<'mode' | 'options'>('mode');
  const [mode, setMode] = useState<CountingMode>('blind');
  const [registerExpiry, setRegisterExpiry] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<SelectedLoad | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('mode');
        setMode('blind');
        setRegisterExpiry(false);
        setSelectedLoad(null);
      }, 300);
    }
  }, [isOpen]);

  const handleModeSelect = (selectedMode: CountingMode) => {
    setMode(selectedMode);
    setStep('options');
  };

  const handleBack = () => {
    setStep('mode');
    setSelectedLoad(null);
  };

  const handleStart = async () => {
    if (mode === 'theoretical' && !selectedLoad) return;

    const config: StartCountingConfig = {
      mode,
      registerExpiry: mode === 'blind' ? registerExpiry : true,
      theoreticalSource: mode === 'theoretical' ? selectedLoad?.source : undefined,
      theoreticalOrderId: mode === 'theoretical' ? selectedLoad?.id : undefined,
      theoreticalOrderName: mode === 'theoretical' ? selectedLoad?.name : undefined,
    };

    // Primero marcar que estamos iniciando para evitar re-renderizados
    const startPromise = onStart(config);
    
    // Cerrar el modal inmediatamente
    onClose();
    
    // Esperar a que onStart complete (que puede incluir navegación)
    try {
      await startPromise;
    } catch (error) {
      console.error('Error starting counting:', error);
    }
  };

  const getActionButtonText = () => {
    if (mode === 'blind') {
      return registerExpiry ? 'Iniciar con vencimiento' : 'Iniciar conteo';
    }
    return selectedLoad ? `Iniciar con "${selectedLoad.name}"` : 'Selecciona una carga';
  };

  const canProceed = mode === 'blind' || (mode === 'theoretical' && selectedLoad !== null);

  const renderContent = () => {
    if (step === 'mode') {
      return (
        <div className="space-y-6">
          <p className="text-base text-secondary text-center">
            Selecciona el tipo de conteo que deseas realizar
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModeCard
              icon={EyeOff}
              iconColor="text-blue-400"
              iconBg="bg-blue-500/10"
              title="Conteo Ciego"
              description="Conteo rápido sin carga teórica. Ideal para inventarios generales o conteos ráfaga."
              isSelected={mode === 'blind'}
              onClick={() => handleModeSelect('blind')}
              badge="Rápido"
              features={['Sin listado previo', 'Escaneo rápido', 'Sin comparación']}
            />
            <ModeCard
              icon={FileText}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10"
              title="Con Carga Teórica"
              description="Comparar contra listado esperado. Muestra diferencias en tiempo real."
              isSelected={mode === 'theoretical'}
              onClick={() => handleModeSelect('theoretical')}
              badge="Preciso"
              features={['Con listado esperado', 'Comparación en vivo', 'Requiere vencimiento']}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Volver
        </button>

        {mode === 'blind' ? (
          <BlindOptions
            registerExpiry={registerExpiry}
            onRegisterExpiryChange={setRegisterExpiry}
          />
        ) : (
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
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'mode' ? 'Nuevo Conteo' : mode === 'blind' ? 'Opciones de Conteo Ciego' : 'Seleccionar Carga Teórica'}
      variant="center"
      size="xl"
      className="bg-base max-w-2xl"
    >
      {/* Progress Steps */}
      <div className="flex items-center gap-3 mb-8">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300',
          step === 'mode' 
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
            : 'bg-blue-500/20 text-blue-400'
        )}>
          {step === 'mode' ? '1' : <Check className="w-5 h-5" />}
        </div>
        <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
            initial={{ width: '0%' }}
            animate={{ width: step === 'mode' ? '50%' : '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300',
          step === 'options' 
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
            : 'bg-elevated text-muted'
        )}>
          2
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Footer Actions */}
      <div className="flex gap-4 mt-8 pt-6 border-t border-subtle">
        <button
          onClick={onClose}
          className="px-6 py-3.5 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Cancelar
        </button>
        <button
          onClick={handleStart}
          disabled={!canProceed}
          className={cn(
            'flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold transition-all duration-200',
            canProceed
              ? 'bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-elevated text-muted cursor-not-allowed'
          )}
        >
          {canProceed ? (
            <>
              {mode === 'blind' ? <Eye className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              <span className="text-base">{getActionButtonText()}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            'Selecciona una opción'
          )}
        </button>
      </div>
    </Modal>
  );
};

// ============================================================================
// COMPONENTES INTERNOS
// ============================================================================

const ModeCard = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  isSelected,
  onClick,
  badge,
  features
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  badge?: string;
  features?: string[];
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full p-6 rounded-2xl border-2 text-left transition-all duration-200',
      'hover:scale-[1.01] active:scale-[0.99]',
      isSelected
        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
        : 'bg-surface border-subtle hover:border-blue-500/30 hover:bg-elevated'
    )}
  >
    <div className="flex items-start gap-5">
      <div className={cn(
        'w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
        iconBg,
        isSelected && 'ring-2 ring-blue-500/30'
      )}>
        <Icon className={cn('w-8 h-8', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className={cn('text-xl font-bold', isSelected ? 'text-blue-400' : 'text-primary')}>
            {title}
          </h3>
          {badge && (
            <span className={cn(
              'px-3 py-1 text-xs font-semibold rounded-full',
              isSelected ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
            )}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-secondary leading-relaxed">{description}</p>
        
        {/* Features list */}
        {features && features.length > 0 && (
          <ul className="mt-4 space-y-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-muted">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                  isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-elevated text-muted'
                )}>
                  <Check className="w-3 h-3" />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cn(
        'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
        isSelected 
          ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/30' 
          : 'border-subtle hover:border-blue-500/30'
      )}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>
    </div>
  </button>
);

const BlindOptions = ({
  registerExpiry,
  onRegisterExpiryChange
}: {
  registerExpiry: boolean;
  onRegisterExpiryChange: (value: boolean) => void;
}) => (
  <div className="space-y-5">
    {/* Info Card */}
    <div className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
          <EyeOff className="w-7 h-7 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-primary">Conteo Ciego</h3>
          <p className="text-sm text-secondary mt-1 leading-relaxed">
            Se registrarán los productos escaneados sin comparar contra ningún listado.
            Ideal para conteos rápidos o inventarios generales.
          </p>
        </div>
      </div>
    </div>

    {/* Expiry Toggle */}
    <div className="p-5 bg-surface border border-subtle rounded-2xl hover:border-blue-500/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-primary">Registrar vencimiento</p>
            <p className="text-sm text-secondary">
              Solicitar fecha de caducidad (mm/yyyy) al escanear
            </p>
          </div>
        </div>
        <Switch
          checked={registerExpiry}
          onChange={onRegisterExpiryChange}
          size="lg"
        />
      </div>
      {registerExpiry && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-400 flex items-center gap-2">
            <span className="text-base">⚠️</span>
            Cada escaneo mostrará un campo para registrar el mes y año de vencimiento.
          </p>
        </div>
      )}
    </div>
  </div>
);

export default StartCountingModal;
