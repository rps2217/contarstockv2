"use client";
/**
 * useScanFeedback - Feedback visual, auditivo y háptico para operaciones de escaneo
 *
 * Proporciona:
 * - Feedback visual con colores animados
 * - Sonidos cortos (opcional)
 * - Vibración háptica en móviles
 */

import React, { useCallback } from 'react'
import { logger } from '@/services/logger';
;
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
    sound: 200,
    vibration: [50],
    toastMessage: 'Registrado correctamente',
  },
  error: {
    color: 'rose',
    icon: '✗',
    sound: 400,
    vibration: [100, 50, 100],
    toastMessage: 'Error al procesar',
  },
  warning: {
    color: 'amber',
    icon: '⚠',
    sound: 300,
    vibration: [50, 30, 50],
    toastMessage: 'Atención requerida',
  },
  info: {
    color: 'blue',
    icon: 'ℹ',
    sound: 500,
    vibration: [30],
    toastMessage: 'Información',
  },
};

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

const playBeep = (frequency: number, duration: number = 100): void => {
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
  } catch {
    console.warn('Audio feedback not available');
  }
};

const vibrate = (pattern: number | number[]): void => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      console.warn('Vibration not available');
    }
  }
};

export function useScanFeedback() {
  const provideFeedback = useCallback((
    type: ScanFeedbackType,
    customMessage?: string,
    options: ScanFeedbackOptions = {}
  ): ScanFeedbackType => {
    const {
      enableSound = true,
      enableVibration = true,
      showToast = false,
    } = options;

    const config = FEEDBACK_CONFIG[type];

    if (enableVibration) {
      vibrate(config.vibration);
    }

    if (enableSound) {
      playBeep(config.sound, 100);
    }

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

  const scanSuccess = useCallback((message?: string, options?: ScanFeedbackOptions): ScanFeedbackType => {
    return provideFeedback('success', message, options);
  }, [provideFeedback]);

  const scanError = useCallback((message?: string, options?: ScanFeedbackOptions): ScanFeedbackType => {
    return provideFeedback('error', message, options);
  }, [provideFeedback]);

  const scanWarning = useCallback((message?: string, options?: ScanFeedbackOptions): ScanFeedbackType => {
    return provideFeedback('warning', message, options);
  }, [provideFeedback]);

  const scanInfo = useCallback((message?: string, options?: ScanFeedbackOptions): ScanFeedbackType => {
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
    return undefined;
  }, [type, onClear, duration]);

  if (!type) return null;

  const config = FEEDBACK_CONFIG[type];

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg bg-${config.color}-500 text-white animate-pulse`}
    >
      <span className="mr-2">{config.icon}</span>
      {message || config.toastMessage}
    </div>
  );
};

export default useScanFeedback;
