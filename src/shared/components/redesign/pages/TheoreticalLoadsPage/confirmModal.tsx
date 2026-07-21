/**
 * Confirm Modal Component
 * Modal de confirmación reutilizable
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, Download, AlertTriangle, Database, CheckCircle2, Play } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  loading?: boolean;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  icon?: React.ElementType;
  extraInfo?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  loading = false,
  variant = 'default',
  icon: CustomIcon,
  extraInfo,
}) => {
  if (!isOpen) return null;

  const variantConfig = {
    default: {
      bg: 'bg-blue-500/10',
      icon: 'text-blue-500',
      btn: 'bg-blue-600 hover:bg-blue-500',
      Icon: CustomIcon || Download,
    },
    danger: {
      bg: 'bg-rose-500/10',
      icon: 'text-rose-500',
      btn: 'bg-rose-600 hover:bg-rose-500',
      Icon: CustomIcon || AlertTriangle,
    },
    warning: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-500',
      btn: 'bg-amber-600 hover:bg-amber-500',
      Icon: CustomIcon || Database,
    },
    success: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-500',
      btn: 'bg-emerald-600 hover:bg-emerald-500',
      Icon: CustomIcon || CheckCircle2,
    },
  };

  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-base border border-subtle rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
              config.bg
            )}
          >
            <config.Icon className={cn('w-8 h-8', config.icon)} />
          </motion.div>
          <h3 className="text-xl font-bold text-primary">{title}</h3>
          <p className="text-sm text-secondary mt-2 leading-relaxed">{description}</p>

          {extraInfo && <div className="mt-4 p-3 bg-surface rounded-xl">{extraInfo}</div>}
        </div>

        <div className="flex gap-3 p-4 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface hover:bg-elevated text-primary rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 py-3 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
              config.btn
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
