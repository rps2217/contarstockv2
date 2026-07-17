/**
 * useVoiceCommands - Hook para control por voz en modo conteo
 *
 * Proporciona:
 * - Activación/desactivación de comandos de voz
 * - Mapeo de comandos a acciones
 * - Feedback visual de estado
 * - Integración con servicios existentes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/services/logger';
import { VoiceCommandService, type VoiceCommandResult } from '../services/VoiceCommandService';

// ============================================================================
// TIPOS
// ============================================================================

export interface VoiceCommandCallbacks {
  onNext?: () => void;
  onPrevious?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSetQuantity?: (qty: number) => void;
  onUndo?: () => void;
  onFinish?: () => void;
  onHelp?: () => void;
  onMute?: () => void;
  onRepeat?: () => void;
}

interface UseVoiceCommandsOptions {
  enabled?: boolean;
  callbacks: VoiceCommandCallbacks;
  autoStart?: boolean;
  showToasts?: boolean;
  language?: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useVoiceCommands(options: UseVoiceCommandsOptions) {
  const {
    enabled = true,
    callbacks,
    autoStart = false,
    showToasts = true,
    language = 'es-ES',
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs para callbacks (evitar stale closures)
  const callbacksRef = useRef(callbacks);
  const isMutedRef = useRef(isMuted);
  const showToastsRef = useRef(showToasts);
  callbacksRef.current = callbacks;
  isMutedRef.current = isMuted;
  showToastsRef.current = showToasts;

  // Verificar soporte
  useEffect(() => {
    setIsSupported(VoiceCommandService.isSupported());
  }, []);

  /**
   * Procesar comando
   */
  const processCommand = useCallback((result: VoiceCommandResult) => {
    const { command, quantity } = result;

    logger.debug('VoiceCommands', 'Processing command', { command, quantity });

    switch (command) {
      case 'NEXT':
        callbacksRef.current.onNext?.();
        if (showToastsRef.current) toast.info('→ Siguiente');
        break;

      case 'PREVIOUS':
        callbacksRef.current.onPrevious?.();
        if (showToastsRef.current) toast.info('← Anterior');
        break;

      case 'CONFIRM':
        callbacksRef.current.onConfirm?.();
        if (showToastsRef.current) toast.success('✓ Confirmado');
        break;

      case 'CANCEL':
        callbacksRef.current.onCancel?.();
        if (showToastsRef.current) toast.warning('✗ Cancelado');
        break;

      case 'SET_QUANTITY':
        if (quantity !== undefined) {
          callbacksRef.current.onSetQuantity?.(quantity);
          if (showToastsRef.current) toast.info(`Cantidad: ×${quantity}`);
        }
        break;

      case 'UNDO':
        callbacksRef.current.onUndo?.();
        if (showToastsRef.current) toast.info('↩ Deshacer');
        break;

      case 'FINISH':
        callbacksRef.current.onFinish?.();
        if (showToastsRef.current) toast.success('✓ Finalizando...');
        break;

      case 'HELP':
        callbacksRef.current.onHelp?.();
        break;

      case 'MUTE':
        setIsMuted(prev => !prev);
        callbacksRef.current.onMute?.();
        if (showToastsRef.current) {
          toast.info(isMutedRef.current ? '🔊 Sonido activado' : '🔇 Silenciado');
        }
        break;

      case 'REPEAT':
        callbacksRef.current.onRepeat?.();
        break;

      case 'UNKNOWN':
        if (showToastsRef.current) {
          toast.warning(`Comando no reconocido: "${result.transcript}"`);
        }
        break;
    }
  }, []);

  /**
   * Iniciar escucha
   */
  const start = useCallback(() => {
    if (!isSupported) {
      toast.error('Comandos de voz no soportados en este navegador');
      return false;
    }

    if (isListening) return true;

    const success = VoiceCommandService.start();
    if (!success && showToasts) {
      toast.error('Error al iniciar comandos de voz');
    }
    return success;
  }, [isSupported, isListening, showToasts]);

  // Ref para start (para auto-start effect)
  const startRef = useRef(start);
  startRef.current = start;

  // Configurar servicio
  useEffect(() => {
    VoiceCommandService.updateConfig({
      language,
      enabled,
      onListening: setIsListening,
      onCommand: result => {
        setLastCommand(result);
        processCommand(result);
      },
      onStart: () => {
        if (showToastsRef.current) {
          toast.info('🎤 Escuchando comandos de voz...', { duration: 2000 });
        }
      },
      onEnd: () => {
        // No spamear toasts al detener
      },
      onError: error => {
        logger.error('VoiceCommands', 'Error', { error });
        if (showToastsRef.current) {
          toast.error(`Error de voz: ${error}`);
        }
      },
    });
  }, [language, enabled, processCommand]);

  // Auto-start si está habilitado
  useEffect(() => {
    if (autoStart && enabled && isSupported) {
      startRef.current();
    }

    return () => {
      VoiceCommandService.stop();
    };
  }, [autoStart, enabled, isSupported]);

  /**
   * Detener escucha
   */
  const stop = useCallback(() => {
    VoiceCommandService.stop();
  }, []);

  /**
   * Toggle escucha
   */
  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  /**
   * Obtener comandos disponibles
   */
  const getAvailableCommands = useCallback(() => {
    return VoiceCommandService.getAvailableCommands();
  }, []);

  return {
    // Estado
    isListening,
    isSupported,
    isMuted,
    lastCommand,

    // Acciones
    start,
    stop,
    toggle,
    getAvailableCommands,

    // Utilidades
    parseCommand: VoiceCommandService.parseCommand.bind(VoiceCommandService),
  };
}

// ============================================================================
// COMPONENTE: VoiceIndicator
// ============================================================================

export function VoiceIndicator({
  isListening,
  isSupported,
  onToggle,
}: {
  isListening: boolean;
  isSupported: boolean;
  onToggle?: () => void;
}) {
  if (!isSupported) return null;

  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-full
        transition-all duration-200
        ${
          isListening
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
            : 'bg-surface text-muted hover:text-primary'
        }
      `}
      title={isListening ? 'Detener voz' : 'Activar voz'}
    >
      {/* Icono de micrófono */}
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>

      {/* Indicador de ondas cuando está activo */}
      {isListening && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="absolute w-full h-full rounded-full bg-blue-500 animate-ping opacity-25" />
          <span className="absolute w-full h-full rounded-full bg-blue-500 animate-pulse opacity-50" />
        </span>
      )}
    </button>
  );
}

export default useVoiceCommands;
