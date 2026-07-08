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

  const handleStart = () => {
    if (mode === 'theoretical' && !selectedLoad) return;

    const config: StartCountingConfig = {
      mode,
      registerExpiry: mode === 'blind' ? registerExpiry : true,
      theoreticalSource: mode === 'theoretical' ? selectedLoad?.source : undefined,
      theoreticalOrderId: mode === 'theoretical' ? selectedLoad?.id : undefined,
      theoreticalOrderName: mode === 'theoretical' ? selectedLoad?.name : undefined,
    };

    onStart(config);
    onClose();
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
        <div className="space-y-4">
          <p className="text-sm text-secondary text-center">
            Selecciona el tipo de conteo que deseas realizar
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModeCard
              icon={EyeOff}
              iconColor="text-blue-400"
              iconBg="bg-blue-500/10"
              title="Conteo Ciego"
              description="Conteo rápido sin carga teórica. Ideal para inventarios generales."
              isSelected={mode === 'blind'}
              onClick={() => handleModeSelect('blind')}
              badge="Rápido"
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
      size="lg"
      className="bg-base"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
          step === 'mode' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
        )}>
          {step === 'mode' ? '1' : <Check className="w-4 h-4" />}
        </div>
        <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: step === 'mode' ? '50%' : '100%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
          step === 'options' ? 'bg-blue-500 text-white' : 'bg-elevated text-muted'
        )}>
          2
        </div>
      </div>

      {renderContent()}

      <div className="flex gap-3 mt-6 pt-4 border-t border-subtle">
        <button
          onClick={onClose}
          className="px-4 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleStart}
          disabled={!canProceed}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all',
            canProceed
              ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30'
              : 'bg-elevated text-muted cursor-not-allowed'
          )}
        >
          {canProceed ? (
            <>
              {mode === 'blind' ? <Eye className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              {getActionButtonText()}
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
  badge
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  badge?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full p-5 rounded-2xl border-2 text-left transition-all',
      'hover:scale-[1.02] active:scale-[0.98]',
      isSelected
        ? 'bg-blue-500/10 border-blue-500/50'
        : 'bg-surface border-subtle hover:border-blue-500/30 hover:bg-elevated'
    )}
  >
    <div className="flex items-start gap-4">
      <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-7 h-7', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn('text-lg font-bold', isSelected ? 'text-blue-400' : 'text-primary')}>
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-secondary mt-1">{description}</p>
      </div>
      <div className={cn(
        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected ? 'bg-blue-500 border-blue-500' : 'border-subtle'
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
  <div className="space-y-4">
    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
          <EyeOff className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-primary">Conteo Ciego</h3>
          <p className="text-xs text-secondary mt-1">
            Se registrarán los productos escaneados sin comparar contra ningún listado.
            Ideal para conteos rápidos o inventarios generales.
          </p>
        </div>
      </div>
    </div>
    <div className="p-4 bg-surface border border-subtle rounded-xl">
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
          onChange={onRegisterExpiryChange}
        />
      </div>
      {registerExpiry && (
        <p className="text-xs text-amber-400 mt-3 pl-13">
          ⚠️ Cada escaneo mostrará un campo para registrar el mes y año de vencimiento.
        </p>
      )}
    </div>
  </div>
);

export default StartCountingModal;
