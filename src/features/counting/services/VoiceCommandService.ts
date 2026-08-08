/**
 * VoiceCommandService - Control por voz para modo hands-free
 *
 * Permite controlar el conteo mediante comandos de voz:
 * - "siguiente" - Ir al siguiente item
 * - "anterior" - Ir al item anterior
 * - "confirmar" - Confirmar escaneo actual
 * - "cantidad [n]" - Establecer cantidad
 * - "cancelar" - Cancelar operación
 * - "terminar" - Finalizar conteo
 * - "ayuda" - Mostrar comandos disponibles
 *
 * Usa Web Speech API para reconocimiento.
 */

import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export type VoiceCommand =
  | 'NEXT'
  | 'PREVIOUS'
  | 'CONFIRM'
  | 'SET_QUANTITY'
  | 'CANCEL'
  | 'FINISH'
  | 'HELP'
  | 'UNDO'
  | 'MUTE'
  | 'LOCATION'
  | 'REPEAT'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  command: VoiceCommand;
  confidence: number;
  transcript: string;
  quantity?: number;
  parameters?: Record<string, string>;
}

export interface VoiceCommandConfig {
  /** Habilitar/deshabilitar */
  enabled: boolean;
  /** Idioma para reconocimiento */
  language: string;
  /** Continuous listening */
  continuous: boolean;
  /** Mostrar visual feedback */
  showVisual: boolean;
  /** Comando para activar listening */
  activationWord?: string;
  /** Callbacks */
  onCommand?: (result: VoiceCommandResult) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onListening?: (isListening: boolean) => void;
}

// ============================================================================
// PATRONES DE COMANDOS
// ============================================================================

const COMMAND_PATTERNS: Array<{
  command: VoiceCommand;
  patterns: RegExp[];
  extractQuantity?: boolean;
}> = [
  // Navegación
  {
    command: 'NEXT',
    patterns: [/^(siguiente|next|siguiente\s*item|avanzar|adelante|sig)$/i, /^(n|sgt)$/i],
  },
  {
    command: 'PREVIOUS',
    patterns: [/^(anterior|prev|anterior\s*item|retroceder|atrás|ant)$/i, /^(p|atr)$/i],
  },

  // Acciones
  {
    command: 'CONFIRM',
    patterns: [/^(confirmar|confirm|ok|si|yes|listo|aceptar|enter|enter)$/i, /^(c|f)$/i],
  },
  {
    command: 'CANCEL',
    patterns: [/^(cancelar|cancel|no|none|rechazar|escape)$/i, /^(x|esc)$/i],
  },
  {
    command: 'UNDO',
    patterns: [/^(deshacer|undo|volver|atrás)$/i, /^(u|z)$/i],
  },

  // Cantidad - necesita extracción
  {
    command: 'SET_QUANTITY',
    patterns: [
      /^(cantidad|cant|quantity|cantidad\s*:?\s*)(\d+)/i,
      /^(cantar?\s*)?(\d+)(\s*(?:unidades?|uds?|pcs?))?$/i,
      /^(numero|número|n)(\d+)$/i,
    ],
    extractQuantity: true,
  },

  // Sistema
  {
    command: 'HELP',
    patterns: [/^(ayuda|help|comandos|commands|que\s*puedo\s*decir)$/i, /^(h|\?)$/i],
  },
  {
    command: 'FINISH',
    patterns: [/^(terminar|finish|finalizar|Listo|completar|done)$/i, /^(f|fin|end)$/i],
  },
  {
    command: 'MUTE',
    patterns: [/^(silenciar|mute|mudos?|apagar\s*sonido|silencio)$/i],
  },
  {
    command: 'LOCATION',
    patterns: [/^(ubicación|location|lugar|posición)\s*(\w+)/i],
  },
  {
    command: 'REPEAT',
    patterns: [/^(repetir|repeat|que\s*dijiste|como\s*quedo)$/i],
  },
];

// ============================================================================
// SERVICIO
// ============================================================================

class VoiceCommandServiceClass {
  private config: VoiceCommandConfig;
  private recognition: any = null;
  private isListening = false;
  private lastResult: VoiceCommandResult | null = null;
  private audioContext: AudioContext | null = null;

  constructor(config: Partial<VoiceCommandConfig> = {}) {
    this.config = {
      enabled: true,
      language: 'es-ES',
      continuous: false,
      showVisual: true,
      ...config,
    };

    this.initSpeechRecognition();
  }

  /**
   * Inicializar Speech Recognition
   */
  private initSpeechRecognition(): void {
    // Verificar soporte
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      logger.warn('VoiceCommand', 'Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = false;
    this.recognition.lang = this.config.language;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.config.onStart?.();
      this.config.onListening?.(true);
      logger.debug('VoiceCommand', 'Started listening');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.config.onEnd?.();
      this.config.onListening?.(false);
      logger.debug('VoiceCommand', 'Stopped listening');
    };

    this.recognition.onerror = (event: any) => {
      logger.error('VoiceCommand', 'Recognition error', { error: event.error });

      if (event.error === 'not-allowed') {
        this.config.onError?.('Permiso de micrófono denegado');
      } else if (event.error === 'no-speech') {
        // No es un error real, solo no hubo voz
      } else {
        this.config.onError?.(`Error: ${event.error}`);
      }
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const last = results[results.length - 1];
      const transcript = last[0].transcript.trim().toLowerCase();
      const confidence = last[0].confidence;

      const result = this.parseCommand(transcript, confidence);
      this.lastResult = result;

      logger.debug('VoiceCommand', 'Command recognized', {
        transcript,
        command: result.command,
        confidence,
      });

      this.config.onCommand?.(result);
    };
  }

  /**
   * Parsear comando desde transcript
   */
  parseCommand(transcript: string, confidence: number): VoiceCommandResult {
    // Intentar coincidir con patrones
    for (const { command, patterns, extractQuantity } of COMMAND_PATTERNS) {
      for (const pattern of patterns) {
        const match = transcript.match(pattern);
        if (match) {
          let quantity: number | undefined;

          if (extractQuantity && match.length > 2) {
            const numStr = match[2] || match[match.length - 1];
            quantity = parseInt(numStr, 10);
            if (isNaN(quantity)) quantity = undefined;
          }

          return {
            command,
            confidence,
            transcript,
            quantity,
            parameters: match.groups || undefined,
          };
        }
      }
    }

    // Comando no reconocido
    return {
      command: 'UNKNOWN',
      confidence,
      transcript,
    };
  }

  /**
   * Iniciar listening
   */
  start(): boolean {
    if (!this.recognition) {
      logger.warn('VoiceCommand', 'Recognition not initialized');
      return false;
    }

    if (this.isListening) {
      logger.debug('VoiceCommand', 'Already listening');
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      logger.error('VoiceCommand', 'Failed to start', { error });
      return false;
    }
  }

  /**
   * Detener listening
   */
  stop(): void {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
    } catch (error) {
      logger.error('VoiceCommand', 'Failed to stop', { error });
    }
  }

  /**
   * Toggle listening
   */
  toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  /**
   * Verificar si está activo
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Obtener último resultado
   */
  getLastResult(): VoiceCommandResult | null {
    return this.lastResult;
  }

  /**
   * Actualizar configuración
   */
  updateConfig(config: Partial<VoiceCommandConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.recognition && config.language) {
      this.recognition.lang = config.language;
    }

    if (this.recognition && config.continuous !== undefined) {
      this.recognition.continuous = config.continuous;
    }
  }

  /**
   * Obtener comandos disponibles
   */
  getAvailableCommands(): Array<{ command: VoiceCommand; examples: string[] }> {
    return [
      { command: 'NEXT', examples: ['siguiente', 'next', 'avanzar'] },
      { command: 'PREVIOUS', examples: ['anterior', 'prev', 'retroceder'] },
      { command: 'CONFIRM', examples: ['confirmar', 'ok', 'listo', 'si'] },
      { command: 'CANCEL', examples: ['cancelar', 'no', 'escape'] },
      { command: 'SET_QUANTITY', examples: ['cantidad 5', '5 unidades', 'numero 10'] },
      { command: 'UNDO', examples: ['deshacer', 'undo', 'volver'] },
      { command: 'FINISH', examples: ['terminar', 'finish', 'finalizar'] },
      { command: 'HELP', examples: ['ayuda', 'help', 'comandos'] },
      { command: 'MUTE', examples: ['silenciar', 'mute', 'apagar sonido'] },
      { command: 'REPEAT', examples: ['repetir', 'repeat'] },
    ];
  }

  /**
   * Verificar si el navegador soporta voz
   */
  isSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Obtener configuración
   */
  getConfig(): VoiceCommandConfig {
    return { ...this.config };
  }

  /**
   * Reproducir audio de confirmación
   */
  private playFeedback(type: 'success' | 'error' | 'info'): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const configs = {
      success: { freq: 880, duration: 0.1 },
      error: { freq: 220, duration: 0.3 },
      info: { freq: 440, duration: 0.15 },
    };

    const config = configs[type];
    oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + config.duration);
  }

  /**
   * Feedback de voz
   */
  speak(text: string): void {
    if (!('speechSynthesis' in window)) {
      logger.warn('VoiceCommand', 'Speech synthesis not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.config.language;
    utterance.rate = 1.1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const VoiceCommandService = new VoiceCommandServiceClass();

export default VoiceCommandService;
