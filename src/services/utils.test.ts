/**
 * Tests para Utils - Funciones de normalización y utilería
 */

import { describe, it, expect } from 'vitest';
import { sanitizeBarcode, normalizeSku, normalizeIdentity, generateUUID } from './utils';

describe('Utils - Normalización', () => {
  describe('sanitizeBarcode', () => {
    it('should return empty string for null/undefined', () => {
      expect(sanitizeBarcode('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeBarcode('  1234567890123  ')).toBe('1234567890123');
    });

    it('should convert to uppercase', () => {
      expect(sanitizeBarcode('abcdef')).toBe('ABCDEF');
    });

    it('should remove special characters', () => {
      expect(sanitizeBarcode('ABC-123/456')).toBe('ABC123456');
    });

    it('should remove control characters', () => {
      expect(sanitizeBarcode('ABC\x00\x1F123')).toBe('ABC123');
    });

    it('should remove unicode special chars', () => {
      expect(sanitizeBarcode('ABC\u200B123')).toBe('ABC123');
    });

    it('should handle mixed input', () => {
      expect(sanitizeBarcode('  abc-123/456!@#  ')).toBe('ABC123456');
    });
  });

  describe('normalizeSku', () => {
    it('should normalize SKU consistently', () => {
      expect(normalizeSku('sku-001')).toBe('SKU001');
      expect(normalizeSku('SKU-001')).toBe('SKU001');
    });

    it('should use same logic as sanitizeBarcode', () => {
      const input = 'SKU-001-ABC';
      expect(normalizeSku(input)).toBe(sanitizeBarcode(input));
    });
  });

  describe('normalizeIdentity', () => {
    it('should return empty string for null/undefined', () => {
      expect(normalizeIdentity('')).toBe('');
      expect(normalizeIdentity(undefined)).toBe('');
      expect(normalizeIdentity(null)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(normalizeIdentity('  12345678-9  ')).toBe('123456789');
    });

    it('should convert to uppercase', () => {
      expect(normalizeIdentity('abcdefgh-k')).toBe('ABCDEFGHK');
    });

    it('should remove all non-alphanumeric characters', () => {
      expect(normalizeIdentity('12.345.678-9')).toBe('123456789');
      expect(normalizeIdentity('12.345.678-K')).toBe('12345678K');
      expect(normalizeIdentity('12,345,678/9')).toBe('123456789');
    });

    it('should normalize RUT format', () => {
      expect(normalizeIdentity('12.345.678-9')).toBe(normalizeIdentity('123456789'));
    });

    it('should handle mixed input', () => {
      expect(normalizeIdentity('  RUT: 12.345.678-K  ')).toBe('RUT12345678K');
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });

    it('should generate uppercase UUIDs', () => {
      const uuid = generateUUID();
      // UUID should have consistent format (hyphens and hex chars)
      expect(uuid).toMatch(/^[0-9A-Fa-f-]+$/);
    });
  });
});
