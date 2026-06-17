/**
 * Tests para ValidationService
 */

import { describe, it, expect } from 'vitest';
import { ValidationService } from './validation';

describe('ValidationService', () => {
  describe('isValidBarcode', () => {
    it('should return true for valid EAN-13 barcodes', () => {
      expect(ValidationService.isValidBarcode('1234567890123')).toBe(true);
    });

    it('should return true for valid EAN-8 barcodes', () => {
      expect(ValidationService.isValidBarcode('12345678')).toBe(true);
    });

    it('should return true for valid UPC-A barcodes', () => {
      expect(ValidationService.isValidBarcode('123456789012')).toBe(true);
    });

    it('should return false for empty barcodes', () => {
      expect(ValidationService.isValidBarcode('')).toBe(false);
      expect(ValidationService.isValidBarcode('   ')).toBe(false);
    });

    it('should return false for barcodes with invalid characters', () => {
      expect(ValidationService.isValidBarcode('ABC123!@#')).toBe(false);
    });
  });

  describe('validateBarcode', () => {
    it('should return valid result for correct barcode', () => {
      const result = ValidationService.validateBarcode('1234567890123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for empty barcode', () => {
      const result = ValidationService.validateBarcode('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for too short barcode', () => {
      const result = ValidationService.validateBarcode('12');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('demasiado corto'))).toBe(true);
    });
  });

  describe('isValidQuantity', () => {
    it('should return true for positive integers', () => {
      expect(ValidationService.isValidQuantity(1)).toBe(true);
      expect(ValidationService.isValidQuantity(100)).toBe(true);
      expect(ValidationService.isValidQuantity(999999)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(ValidationService.isValidQuantity(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(ValidationService.isValidQuantity(-1)).toBe(false);
      expect(ValidationService.isValidQuantity(-100)).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(ValidationService.isValidQuantity(1.5)).toBe(false);
      expect(ValidationService.isValidQuantity(3.14)).toBe(false);
    });
  });

  describe('validateQuantity', () => {
    it('should return valid result for valid quantity', () => {
      const result = ValidationService.validateQuantity(10);
      expect(result.valid).toBe(true);
    });

    it('should validate min constraint', () => {
      const result = ValidationService.validateQuantity(5, { min: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('al menos'))).toBe(true);
    });

    it('should validate max constraint', () => {
      const result = ValidationService.validateQuantity(100, { max: 50 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceder'))).toBe(true);
    });
  });

  describe('isValidLocation', () => {
    it('should return true for valid locations', () => {
      expect(ValidationService.isValidLocation('A1')).toBe(true);
      expect(ValidationService.isValidLocation('ZONE-A-1')).toBe(true);
      expect(ValidationService.isValidLocation('SHELF_1')).toBe(true);
    });

    it('should return false for empty locations', () => {
      expect(ValidationService.isValidLocation('')).toBe(false);
    });

    it('should return false for locations with invalid characters', () => {
      expect(ValidationService.isValidLocation('A1!@#')).toBe(false);
      expect(ValidationService.isValidLocation('A 1')).toBe(false);
    });
  });

  describe('validateLocation', () => {
    it('should return valid result for correct location', () => {
      const result = ValidationService.validateLocation('A1');
      expect(result.valid).toBe(true);
    });

    it('should return errors for too short location', () => {
      const result = ValidationService.validateLocation('A');
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(ValidationService.isValidDate(new Date())).toBe(true);
      expect(ValidationService.isValidDate('2024-01-15')).toBe(true);
      expect(ValidationService.isValidDate('2024-12-31')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(ValidationService.isValidDate('invalid')).toBe(false);
      expect(ValidationService.isValidDate('')).toBe(false);
    });
  });

  describe('cleanBarcode', () => {
    it('should trim and uppercase barcode', () => {
      expect(ValidationService.cleanBarcode('  1234567890123  ')).toBe('1234567890123');
      expect(ValidationService.cleanBarcode('abc')).toBe('ABC');
    });

    it('should remove spaces', () => {
      expect(ValidationService.cleanBarcode('1234 5678 9012 3')).toBe('1234567890123');
    });
  });

  describe('cleanLocation', () => {
    it('should trim, uppercase and replace spaces with dashes', () => {
      expect(ValidationService.cleanLocation('  zone a 1 ')).toBe('ZONE-A-1');
    });
  });
});
