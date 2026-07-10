/**
 * CountingFinishModal - Modal de confirmación para finalizar el conteo
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';

interface CountingFinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stats: {
    total: number;
    complete: number;
    totalQty: number;
    withVariance: number;
  };
  sessionName?: string;
  isLoading?: boolean;
  className?: string;
}

export const CountingFinishModal = memo(({
  isOpen,
  onClose,
  onConfirm,
  stats,
  sessionName,
  isLoading = false,
  className = '',
}: CountingFinishModalProps) => {
  const varianceCount = stats.withVariance;
  const hasVariance = varianceCount > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Finalizar Conteo?"
      variant="center"
      size="sm"
      className={className}
      footer={
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Finalizar
          </Button>
        </div>
      }
    >
      <div className="text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        {/* Message */}
        <p className="text-sm text-secondary mb-4">
          Se registrarán <span className="font-bold text-primary">{stats.total}</span> productos 
          (<span className="font-bold text-primary">{stats.totalQty}</span> unidades) en esta sesión.
        </p>

        {/* Stats Summary */}
        <div className="bg-surface rounded-xl p-4 mb-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total items:
            </span>
            <span className="text-primary font-bold">{stats.total}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-emerald-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Completos:
            </span>
            <span className="text-emerald-400 font-bold">{stats.complete}</span>
          </div>

          {hasVariance && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Con variación:
              </span>
              <span className="text-amber-400 font-bold">{varianceCount}</span>
            </div>
          )}
        </div>

        {/* Warning for variance */}
        {hasVariance && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              Hay <strong>{varianceCount}</strong> productos con variación respecto al stock esperado.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
});

CountingFinishModal.displayName = 'CountingFinishModal';

// Legacy version with framer-motion
export const CountingFinishModalLegacy = memo(({
  isOpen,
  onClose,
  onConfirm,
  stats,
  sessionName,
}: Omit<CountingFinishModalProps, 'isLoading' | 'className'>) => {
  const varianceCount = stats.withVariance;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-base border border-subtle rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">¿Finalizar Conteo?</h2>
          <p className="text-sm text-secondary mb-4">
            Se registrarán <span className="font-bold text-primary">{stats.total}</span> productos 
            ({stats.totalQty} unidades) en esta sesión.
          </p>
          
          <div className="bg-surface rounded-xl p-4 mb-4 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">Completos:</span>
              <span className="text-emerald-400 font-bold">{stats.complete}</span>
            </div>
            {varianceCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-400">Con variación:</span>
                <span className="text-amber-400 font-bold">{varianceCount}</span>
              </div>
            )}
          </div>

          {varianceCount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                Hay <strong>{varianceCount}</strong> productos con variación.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-surface/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-medium text-secondary hover:bg-surface rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            Finalizar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

CountingFinishModalLegacy.displayName = 'CountingFinishModalLegacy';