/**
 * ScannerFeedbackOverlay - Overlay de feedback visual mejorado
 * 
 * Muestra feedback visual y auditivo según el estado del scan:
 * - success: verde con checkmark
 * - error: rojo con X
 * - unknown: amarillo con ?
 * - undo: azul con flecha
 * - duplicate: naranja con warning
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, HelpCircle, Undo2, AlertTriangle } from 'lucide-react';

interface ScannerFeedbackOverlayProps {
  feedback: string;
  message?: string;
  showIcon?: boolean;
  duration?: number;
}

interface FeedbackConfig {
  bg: string;
  border: string;
  icon: React.ReactNode;
  textColor: string;
  sound?: 'success' | 'error' | 'warning';
}

const FEEDBACK_CONFIGS: Record<string, FeedbackConfig> = {
  success: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/50',
    icon: <Check className="w-16 h-16" />,
    textColor: 'text-emerald-400',
    sound: 'success',
  },
  error: {
    bg: 'bg-rose-500/25',
    border: 'border-rose-500/50',
    icon: <X className="w-16 h-16" />,
    textColor: 'text-rose-400',
    sound: 'error',
  },
  unknown: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    icon: <HelpCircle className="w-16 h-16" />,
    textColor: 'text-amber-400',
    sound: 'warning',
  },
  undo: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    icon: <Undo2 className="w-16 h-16" />,
    textColor: 'text-blue-400',
  },
  warning: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/50',
    icon: <AlertTriangle className="w-16 h-16" />,
    textColor: 'text-orange-400',
    sound: 'warning',
  },
  incident: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    icon: <AlertTriangle className="w-16 h-16" />,
    textColor: 'text-purple-400',
    sound: 'warning',
  },
  info: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    icon: <HelpCircle className="w-16 h-16" />,
    textColor: 'text-blue-400',
  },
  idle: {
    bg: '',
    border: '',
    icon: <div />,
    textColor: '',
  },
};

export const ScannerFeedbackOverlay: React.FC<ScannerFeedbackOverlayProps> = ({ 
  feedback, 
  message,
  showIcon = true,
  duration = 800,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const config = FEEDBACK_CONFIGS[feedback];

  useEffect(() => {
    if (feedback && config) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback, config, duration]);

  if (!config) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Background flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`fixed inset-0 z-[200] pointer-events-none ${config.bg}`}
          />
          
          {/* Icon center */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] pointer-events-none`}
          >
            <div className={`w-32 h-32 rounded-full ${config.bg} border-4 ${config.border} flex items-center justify-center`}>
              <div className={config.textColor}>
                {config.icon}
              </div>
            </div>
            
            {/* Message */}
            {message && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ delay: 0.1 }}
                className={`text-center mt-4 text-sm font-medium ${config.textColor}`}
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
