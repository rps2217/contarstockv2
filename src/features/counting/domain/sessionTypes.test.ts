/**
 * Session Types Tests - Mode-switching tipado
 */

import { describe, it, expect, vi } from 'vitest';
import {
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
} from './sessionTypes';

// Mock de SYNC_CONSTANTS
vi.mock('@/lib/syncConfig', () => ({
  SYNC_CONSTANTS: {
    BATCH_PREFIX: 'HM-',
  },
}));

describe('sessionTypes', () => {
  // =========================================================================
  // parseSessionId
  // =========================================================================
  describe('parseSessionId', () => {
    it('debería parsear IDs de modo ciego', () => {
      const result = parseSessionId('HM-A1B2C3D4');
      expect(result.sessionId.mode).toBe('blind');
      expect(result.sessionId.raw).toBe('HM-A1B2C3D4');
      expect(result.sessionId.prefix).toBe('HM-');
      expect(result.sessionId.isValid).toBe(true);
    });

    it('debería parsear IDs de modo teórico por defecto', () => {
      const result = parseSessionId('session-123-uuid');
      expect(result.sessionId.mode).toBe('theoretical');
      expect(result.sessionId.raw).toBe('session-123-uuid');
      expect(result.sessionId.prefix).toBe('');
      expect(result.sessionId.isValid).toBe(true);
    });

    it('debería manejar IDs nulos', () => {
      const result = parseSessionId(null);
      expect(result.sessionId.mode).toBe('theoretical');
      expect(result.sessionId.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('debería manejar IDs undefined', () => {
      const result = parseSessionId(undefined);
      expect(result.sessionId.isValid).toBe(false);
    });

    it('debería manejar IDs vacíos', () => {
      const result = parseSessionId('');
      expect(result.sessionId.isValid).toBe(false);
    });

    it('debería trimmar espacios', () => {
      const result = parseSessionId('  HM-TEST123  ');
      expect(result.sessionId.raw).toBe('HM-TEST123');
    });
  });

  // =========================================================================
  // isBlindSession
  // =========================================================================
  describe('isBlindSession', () => {
    it('debería retornar true para IDs de modo ciego (string)', () => {
      expect(isBlindSession('HM-A1B2C3D4')).toBe(true);
    });

    it('debería retornar false para IDs teóricos (string)', () => {
      expect(isBlindSession('session-123')).toBe(false);
    });

    it('debería retornar true para SessionId de modo ciego', () => {
      const sessionId = createBlindSessionId('TEST123');
      expect(isBlindSession(sessionId)).toBe(true);
    });

    it('debería retornar false para SessionId de modo teórico', () => {
      const sessionId = createTheoreticalSessionId('uuid-123');
      expect(isBlindSession(sessionId)).toBe(false);
    });
  });

  // =========================================================================
  // isTheoreticalSession
  // =========================================================================
  describe('isTheoreticalSession', () => {
    it('debería retornar true para IDs teóricos', () => {
      expect(isTheoreticalSession('session-123')).toBe(true);
    });

    it('debería retornar false para IDs de modo ciego', () => {
      expect(isTheoreticalSession('HM-A1B2C3D4')).toBe(false);
    });
  });

  // =========================================================================
  // createBlindSessionId
  // =========================================================================
  describe('createBlindSessionId', () => {
    it('debería crear ID con prefijo HM-', () => {
      const id = createBlindSessionId('TEST123');
      expect(id.raw).toBe('HM-TEST123');
      expect(id.mode).toBe('blind');
      expect(id.prefix).toBe('HM-');
      expect(id.isValid).toBe(true);
    });

    it('debería generar sufijo único si no se provee', () => {
      const id = createBlindSessionId();
      expect(id.raw.startsWith('HM-')).toBe(true);
      expect(id.raw.length).toBeGreaterThan(3);
    });
  });

  // =========================================================================
  // createTheoreticalSessionId
  // =========================================================================
  describe('createTheoreticalSessionId', () => {
    it('debería crear ID teórico', () => {
      const id = createTheoreticalSessionId('uuid-123-abc');
      expect(id.raw).toBe('uuid-123-abc');
      expect(id.mode).toBe('theoretical');
      expect(id.prefix).toBe('');
      expect(id.isValid).toBe(true);
    });
  });

  // =========================================================================
  // generateBlindSuffix
  // =========================================================================
  describe('generateBlindSuffix', () => {
    it('debería generar sufijo alfanumérico', () => {
      const suffix = generateBlindSuffix();
      expect(suffix).toMatch(/^[A-Z0-9]+$/);
    });

    it('debería generar sufijos únicos', () => {
      const suffix1 = generateBlindSuffix();
      const suffix2 = generateBlindSuffix();
      expect(suffix1).not.toBe(suffix2);
    });
  });

  // =========================================================================
  // getSessionMode
  // =========================================================================
  describe('getSessionMode', () => {
    it('debería retornar blind para HM-', () => {
      expect(getSessionMode('HM-TEST')).toBe('blind');
    });

    it('debería retornar theoretical por defecto', () => {
      expect(getSessionMode('session-123')).toBe('theoretical');
    });
  });

  // =========================================================================
  // isValidBlindSessionFormat
  // =========================================================================
  describe('isValidBlindSessionFormat', () => {
    it('debería validar formatos correctos', () => {
      expect(isValidBlindSessionFormat('HM-ABC123')).toBe(true);
      expect(isValidBlindSessionFormat('HM-123456')).toBe(true);
      expect(isValidBlindSessionFormat('HM-A1B2C3')).toBe(true);
    });

    it('debería rechazar formatos incorrectos', () => {
      expect(isValidBlindSessionFormat('HM-ABC')).toBe(false); // Muy corto
      expect(isValidBlindSessionFormat('HM-')).toBe(false); // Sin sufijo
      expect(isValidBlindSessionFormat('session-123')).toBe(false);
    });
  });

  // =========================================================================
  // getModeLabel
  // =========================================================================
  describe('getModeLabel', () => {
    it('debería retornar labels correctos', () => {
      expect(getModeLabel('blind')).toBe('Conteo Ciego');
      expect(getModeLabel('theoretical')).toBe('Conteo con Carga Teórica');
    });
  });

  // =========================================================================
  // getModeShortLabel
  // =========================================================================
  describe('getModeShortLabel', () => {
    it('debería retornar labels cortos', () => {
      expect(getModeShortLabel('blind')).toBe('Ciego');
      expect(getModeShortLabel('theoretical')).toBe('Teórico');
    });
  });
});
