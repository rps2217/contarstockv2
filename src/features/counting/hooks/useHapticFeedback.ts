/**
 * useHapticFeedback - Feedback háptico para dispositivos móviles
 *
 * Proporciona vibración diferenciada según el tipo de feedback:
 * - success: Vibración corta y suave
 * - error: Vibración doble corta
 * - warning: Vibración media
 * - impact: Vibración de impacto
 */

import { useCallback } from 'react';
import { logger } from '@/services/logger';

interface HapticConfig {
  enabled: boolean;
  successDuration?: number;
  errorDuration?: number;
  warningDuration?: number;
  impactDuration?: number;
}

const DEFAULT_CONFIG: HapticConfig = {
  enabled: true,
  successDuration: 20, // Vibración corta
  errorDuration: 50, // Vibración doble
  warningDuration: 100, // Vibración media
  impactDuration: 30, // Vibración de impacto
};

export function useHapticFeedback(config: Partial<HapticConfig> = {}) {
  const finalConfig: HapticConfig = { ...DEFAULT_CONFIG, ...config };

  // Verificar si el dispositivo soporta vibración
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Vibrar patrón
  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!finalConfig.enabled || !isSupported) return;

      try {
        navigator.vibrate(pattern);
      } catch (error: unknown) {
        logger.debug('HapticFeedback', 'Vibration failed', { error });
      }
    },
    [finalConfig.enabled, isSupported]
  );

  // Feedback éxito
  const success = useCallback(() => {
    vibrate(finalConfig.successDuration!);
  }, [vibrate, finalConfig.successDuration]);

  // Feedback error
  const error = useCallback(() => {
    // Vibración doble para error
    vibrate([finalConfig.errorDuration!, finalConfig.errorDuration!]);
  }, [vibrate, finalConfig.errorDuration]);

  // Feedback advertencia
  const warning = useCallback(() => {
    vibrate(finalConfig.warningDuration!);
  }, [vibrate, finalConfig.warningDuration]);

  // Feedback de impacto
  const impact = useCallback(() => {
    vibrate(finalConfig.impactDuration!);
  }, [vibrate, finalConfig.impactDuration]);

  // Vibración custom
  const custom = useCallback(
    (pattern: number | number[]) => {
      vibrate(pattern);
    },
    [vibrate]
  );

  // Detener vibración
  const stop = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  // Toggle enabled
  const toggle = useCallback(() => {
    finalConfig.enabled = !finalConfig.enabled;
  }, [finalConfig]);

  return {
    isSupported,
    isEnabled: finalConfig.enabled,
    success,
    error,
    warning,
    impact,
    custom,
    stop,
    toggle,
    enable: () => {
      finalConfig.enabled = true;
    },
    disable: () => {
      finalConfig.enabled = false;
    },
  };
}

export default useHapticFeedback;
