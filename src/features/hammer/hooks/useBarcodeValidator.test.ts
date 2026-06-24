/**
 * useBarcodeValidator Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeValidator } from './useBarcodeValidator';

describe('useBarcodeValidator', () => {
  describe('normalize', () => {
    it('should trim whitespace', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      expect(result.current.normalize('  123456789  ')).toBe('123456789');
      expect(result.current.normalize('\t\n123456789\r\n')).toBe('123456789');
    });

    it('should convert alphanumeric to uppercase', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      expect(result.current.normalize('abc123')).toBe('ABC123');
      expect(result.current.normalize('ABC123')).toBe('ABC123');
    });

    it('should keep numeric codes as-is', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      expect(result.current.normalize('123456789')).toBe('123456789');
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      expect(result.current.normalize('')).toBe('');
    });
  });

  describe('validate', () => {
    it('should accept valid EAN-13', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      const validation = result.current.validate('5901234123457');
      expect(validation.isValid).toBe(true);
      expect(validation.normalized).toBe('5901234123457');
    });

    it('should accept valid UPC-A', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      const validation = result.current.validate('012345678901');
      expect(validation.isValid).toBe(true);
    });

    it('should accept CODE-128 alphanumeric', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      const validation = result.current.validate('ABC-123-XYZ');
      expect(validation.isValid).toBe(true);
    });

    it('should reject empty barcode', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      const validation = result.current.validate('');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Código vacío');
    });

    it('should reject barcode too short', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      const validation = result.current.validate('123');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('muy corto');
    });

    it('should reject barcode too long', () => {
      const { result } = renderHook(() => useBarcodeValidator({ maxLength: 10 }));
      
      const validation = result.current.validate('12345678901234567890');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('muy largo');
    });
  });

  describe('isValid', () => {
    it('should return boolean', () => {
      const { result } = renderHook(() => useBarcodeValidator());
      
      expect(result.current.isValid('123456789')).toBe(true);
      expect(result.current.isValid('')).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should respect custom minLength', () => {
      const { result } = renderHook(() => useBarcodeValidator({ minLength: 8 }));
      
      expect(result.current.isValid('1234567')).toBe(false);
      expect(result.current.isValid('12345678')).toBe(true);
    });

    it('should respect custom maxLength', () => {
      const { result } = renderHook(() => useBarcodeValidator({ maxLength: 6 }));
      
      expect(result.current.isValid('1234567')).toBe(false);
      expect(result.current.isValid('123456')).toBe(true);
    });
  });
});
