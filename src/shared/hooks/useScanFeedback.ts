"use client";
/**
 * useScanFeedback - Feedback visual, auditivo y háptico para operaciones de escaneo
 * 
 * Proporciona:
 * - Feedback visual con colores animados
 * - Sonidos cortos (opcional)
 * - Vibración háptica en móviles
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

export type ScanFeedbackType = 'success' | 'error' | 'warning' | 'info';

interface ScanFeedbackOptions {
  enableSound?: boolean;
  enableVibration?: boolean;
  duration?: number;
  showToast?: boolean;
}

const FEEDBACK_CONFIG = {
  success: {
    color: 'emerald',
    icon: '✓',
    sound: 200, // Hz
    vibration: [50], // ms
    toastMessage: 'Registrado correctamente',
  },
  error: {
    color: 'rose',
    icon: '✗',
    sound: 400, // Hz
    vibration: [100, 50, 100], // patrón
    toastMessage: 'Error al procesar',
  },
  warning: {
    color: 'amber',
    icon: '⚠',
    sound: 300, // Hz
    vibration: [50, 30, 50],
    toastMessage: 'Atención requerida',
  },
  info: {
    color: 'blue',
    icon: 'ℹ',
    sound: 500, // Hz
    vibration: [30],
    toastMessage: 'Información',
  },
};

// Audio context para generar sonidos
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playBeep = (frequency: number, duration: number = 100) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    console.warn('Audio feedback not available:', e);
  }
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration not available:', e);
    }
  }
};

export function useScanFeedback() {
  const provideFeedback = useCallback((
    type: ScanFeedbackType,
    customMessage?: string,
    options: ScanFeedbackOptions = {}
  ) => {
    const {
      enableSound = true,
      enableVibration = true,
      showToast = false,
    } = options;

    const config = FEEDBACK_CONFIG[type];

    // Feedback háptico
    if (enableVibration) {
      vibrate(config.vibration);
    }

    // Feedback auditivo
    if (enableSound) {
      playBeep(config.sound, 100);
    }

    // Toast (opcional, para casos especiales)
    if (showToast) {
      const message = customMessage || config.toastMessage;
      
      switch (type) {
        case 'success':
          toast.success(message, { duration: 2000 });
          break;
        case 'error':
          toast.error(message, { duration: 3000 });
          break;
        case 'warning':
          toast.warning(message, { duration: 3000 });
          break;
        default:
          toast.info(message, { duration: 2000 });
      }
    }

    return type;
  }, []);

  // Métodos shortcuts para casos comunes
  const scanSuccess = useCallback((message?: string, options?: ScanFeedbackOptions) => {
    return provideFeedback('success', message, options);
  }, [provideFeedback]);

  const scanError = useCallback((message?: string, options?: ScanFeedbackOptions) => {
    return provideFeedback('error', message, options);
  }, [provideFeedback]);

  const scanWarning = useCallback((message?: string, options?: ScanFeedbackOptions) => {
    return provideFeedback('warning', message, options);
  }, [provideFeedback]);

  const scanInfo = useCallback((message?: string, options?: ScanFeedbackOptions) => {
    return provideFeedback('info', message, options);
  }, [provideFeedback]);

  return {
    provideFeedback,
    scanSuccess,
    scanError,
    scanWarning,
    scanInfo,
    FEEDBACK_CONFIG,
  };
}

// Componente para feedback visual inline
import React from 'react';

interface ScanFeedbackProps {
  type: ScanFeedbackType | null;
  message?: string;
  onClear?: () => void;
  duration?: number;
}

export const ScanFeedback: React.FC<ScanFeedbackProps> = ({
  type,
  message,
  onClear,
  duration = 2000,
}) => {
  React.useEffect(() => {
    if (type && onClear) {
      const timer = setTimeout(onClear, duration);
      return () => clearTimeout(timer);
    }
  }, [type, onClear, duration]);

  if (!type) return null;

  const config = FEEDBACK_CONFIG[type];

  const colorClasses = {
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    error: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  };

  return (
    <div
      className={`
        fixed top-24 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-full border-2
        flex items-center gap-3
        animate-in fade-in slide-in-from-top-4
        ${colorClasses[type]}
      `}
    >
      <span className="text-2xl">{config.icon}</span>
      <span className="font-semibold">
        {message || config.toastMessage}
      </span>
    </div>
  );
};

export default useScanFeedback;