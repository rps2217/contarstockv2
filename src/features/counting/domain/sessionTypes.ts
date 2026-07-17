/**
 * Session Types - Tipos y utilidades para IDs de sesión
 *
 * Centraliza la lógica de mode-switching entre conteo ciego y teórico.
 * Antes: sessionId.startsWith('HM-')
 * Ahora: tipado explícito con parser centralizado
 */

import { SYNC_CONSTANTS } from '@/lib/syncConfig';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Modos de conteo soportados
 */
export type CountingMode = 'blind' | 'theoretical';

/**
 * ID de sesión tipado
 */
export interface SessionId {
  readonly raw: string;
  readonly mode: CountingMode;
  readonly prefix: string;
  readonly isValid: boolean;
}

/**
 * Resultado de parsear un ID de sesión
 */
export interface ParseSessionIdResult {
  readonly sessionId: SessionId;
  readonly error?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BLIND_PREFIX = SYNC_CONSTANTS.BATCH_PREFIX; // 'HM-'

// ============================================================================
// PARSER
// ============================================================================

/**
 * Parsear un string de sesión a un SessionId tipado
 *
 * @example
 * const result = parseSessionId('HM-A1B2C3D4');
 * if (result.sessionId.mode === 'blind') {
 *   // Modo ciego
 * }
 */
function parseSessionId(id: string | null | undefined): ParseSessionIdResult {
  // Manejar valores nulos o vacíos
  if (!id || typeof id !== 'string') {
    return {
      sessionId: {
        raw: '',
        mode: 'theoretical', // Default
        prefix: '',
        isValid: false,
      },
      error: 'ID de sesión inválido o vacío',
    };
  }

  const trimmedId = id.trim();

  // Verificar modo ciego
  if (trimmedId.startsWith(BLIND_PREFIX)) {
    return {
      sessionId: {
        raw: trimmedId,
        mode: 'blind',
        prefix: BLIND_PREFIX,
        isValid: true,
      },
    };
  }

  // Modo teórico por defecto
  return {
    sessionId: {
      raw: trimmedId,
      mode: 'theoretical',
      prefix: '',
      isValid: true,
    },
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Verificar si un ID de sesión es modo ciego
 *
 * @example
 * if (isBlindSession(sessionId)) {
 *   // No mostrar carga teórica
 * }
 */
function isBlindSession(id: string | SessionId): boolean {
  if (typeof id === 'object' && 'mode' in id) {
    return id.mode === 'blind';
  }
  return id.startsWith(BLIND_PREFIX);
}

/**
 * Verificar si un ID de sesión es modo teórico
 */
function isTheoreticalSession(id: string | SessionId): boolean {
  return !isBlindSession(id);
}

/**
 * Crear un SessionId en modo ciego
 */
function createBlindSessionId(suffix?: string): SessionId {
  const uniqueId = suffix || generateBlindSuffix();
  return {
    raw: `${BLIND_PREFIX}${uniqueId}`,
    mode: 'blind',
    prefix: BLIND_PREFIX,
    isValid: true,
  };
}

/**
 * Crear un SessionId en modo teórico
 */
function createTheoreticalSessionId(uuid: string): SessionId {
  return {
    raw: uuid,
    mode: 'theoretical',
    prefix: '',
    isValid: true,
  };
}

/**
 * Generar sufijo único para sesiones ciegas
 */
function generateBlindSuffix(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}${random}`.toUpperCase();
}

/**
 * Obtener el modo de un ID de sesión (string)
 */
function getSessionMode(id: string): CountingMode {
  if (id.startsWith(BLIND_PREFIX)) {
    return 'blind';
  }
  return 'theoretical';
}

/**
 * Validar formato de ID de sesión ciego
 */
function isValidBlindSessionFormat(id: string): boolean {
  // Formato: HM-XXXXXXXX donde X es alfanumérico
  const blindPattern = /^HM-[A-Z0-9]{6,}$/i;
  return blindPattern.test(id);
}

/**
 * Obtener label amigable para el modo
 */
function getModeLabel(mode: CountingMode): string {
  switch (mode) {
    case 'blind':
      return 'Conteo Ciego';
    case 'theoretical':
      return 'Conteo con Carga Teórica';
  }
}

/**
 * Obtener descripción corta del modo
 */
function getModeShortLabel(mode: CountingMode): string {
  switch (mode) {
    case 'blind':
      return 'Ciego';
    case 'theoretical':
      return 'Teórico';
  }
}

// ============================================================================
// HOOK HELPERS
// ============================================================================

/**
 * Hook helper para usar en componentes React
 * Retorna el modo actual y utilidades
 */
function useSessionMode(sessionId: string | null | undefined) {
  const { sessionId: parsed, error } = parseSessionId(sessionId);

  return {
    mode: parsed.mode,
    isBlind: parsed.mode === 'blind',
    isTheoretical: parsed.mode === 'theoretical',
    isValid: parsed.isValid,
    error,
    rawId: parsed.raw,
    prefix: parsed.prefix,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  parseSessionId,
  isBlindSession,
  isTheoreticalSession,
  createBlindSessionId,
  createTheoreticalSessionId,
  generateBlindSuffix,
  getSessionMode,
  isValidBlindSessionFormat,
  getModeLabel,
  getModeShortLabel,
};
