/**
 * syncHelpers Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { formatError, extractColumnNameFromError, sanitizeData } from './syncHelpers';

// Mock telemetry
vi.mock('@/services/analytics/telemetryService', () => ({
  telemetry: {
    track: vi.fn(),
  },
}));

describe('syncHelpers', () => {
  describe('formatError', () => {
    it('should format Error object', () => {
      const error = new Error('Test error message');
      const result = formatError(error);
      expect(result).toBe('Test error message');
    });

    it('should handle null/undefined', () => {
      expect(formatError(null)).toBe('Error desconocido');
      expect(formatError(undefined)).toBe('Error desconocido');
    });

    it('should handle string error', () => {
      expect(formatError('Simple error string')).toBe('Simple error string');
    });

    it('should handle object without message', () => {
      const obj = { code: 500, info: 'test' };
      expect(formatError(obj)).toBe(String(obj));
    });

    it('should handle Error with custom message property', () => {
      const error = { message: 'Custom message', stack: 'ignored' } as unknown as Error;
      expect(formatError(error)).toBe('Custom message');
    });
  });

  describe('extractColumnNameFromError', () => {
    it('should extract column name with quotes', () => {
      const errorMsg = 'column "product_name" does not exist';
      const result = extractColumnNameFromError(errorMsg);
      expect(result).toBe('product_name');
    });

    it('should extract column name without quotes', () => {
      const errorMsg = 'column sku_id does not exist';
      const result = extractColumnNameFromError(errorMsg);
      expect(result).toBe('sku_id');
    });

    it('should return null for invalid error message', () => {
      expect(extractColumnNameFromError('')).toBeNull();
      expect(extractColumnNameFromError('invalid error')).toBeNull();
    });
  });

  describe('sanitizeData', () => {
    it('should filter out null and undefined values', () => {
      const data = {
        name: 'Test',
        age: null,
        email: undefined,
        active: true,
      };
      const result = sanitizeData(data);
      expect(result).toEqual({ name: 'Test', active: true });
    });

    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const data = { created: date };
      const result = sanitizeData(data);
      expect(result.created).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle nested objects', () => {
      const data = {
        user: { name: 'John', active: true },
        count: 5,
      };
      const result = sanitizeData(data);
      expect(result).toEqual(data);
    });

    it('should return empty object for all null/undefined', () => {
      const data = { a: null, b: undefined };
      const result = sanitizeData(data);
      expect(result).toEqual({});
    });
  });
});
