/**
 * Tests para schemas de validación
 */

import { describe, it, expect } from 'vitest';
import { 
  safeValidate,
  ProductSchema,
  ProviderSchema,
  ExpiryRecordSchema,
  barcodeSchema,
  rutSchema,
  validateBarcode,
  validateRut
} from './schemas';

describe('schemas', () => {
  describe('barcodeSchema', () => {
    it('should accept valid barcodes', () => {
      expect(barcodeSchema.safeParse('12345678').success).toBe(true);
      expect(barcodeSchema.safeParse('1234567890123').success).toBe(true);
      expect(barcodeSchema.safeParse('ABC-123-456').success).toBe(true);
    });

    it('should reject invalid barcodes', () => {
      expect(barcodeSchema.safeParse('1234567').success).toBe(false); // too short
      expect(barcodeSchema.safeParse('ABC@#').success).toBe(false); // invalid chars
    });
  });

  describe('rutSchema', () => {
    it('should accept valid RUTs', () => {
      expect(rutSchema.safeParse('12.345.678-9').success).toBe(true);
      expect(rutSchema.safeParse('12345678-5').success).toBe(true);
    });

    it('should transform to uppercase', () => {
      const result = rutSchema.parse('12.345.678-k');
      expect(result).toBe('12.345.678-K');
    });
  });

  describe('ProductSchema', () => {
    it('should validate a complete product', () => {
      const product = {
        barcode: '12345678',
        name: 'Test Product',
        category: 'GENERAL',
        price: 1000,
        unitsPerBox: 12
      };
      
      const result = safeValidate(ProductSchema, product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.barcode).toBe('12345678');
        expect(result.data.unitsPerBox).toBe(12);
      }
    });

    it('should apply defaults', () => {
      const product = {
        barcode: '12345678',
        name: 'Test Product'
      };
      
      const result = safeValidate(ProductSchema, product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('GENERAL');
        expect(result.data.price).toBe(0);
        expect(result.data.unitsPerBox).toBe(1);
      }
    });

    it('should reject missing required fields', () => {
      const product = {
        barcode: '12345678'
        // missing name
      };
      
      const result = safeValidate(ProductSchema, product);
      expect(result.success).toBe(false);
    });

    it('should reject invalid barcode', () => {
      const product = {
        barcode: '123', // too short
        name: 'Test'
      };
      
      const result = safeValidate(ProductSchema, product);
      expect(result.success).toBe(false);
    });
  });

  describe('ProviderSchema', () => {
    it('should validate a complete provider', () => {
      const provider = {
        rut: '12.345.678-9',
        name: 'Test Provider',
        withdrawalDays: 30,
        hasExchange: true
      };
      
      const result = safeValidate(ProviderSchema, provider);
      expect(result.success).toBe(true);
    });

    it('should reject invalid RUT', () => {
      const provider = {
        rut: 'invalid',
        name: 'Test'
      };
      
      const result = safeValidate(ProviderSchema, provider);
      expect(result.success).toBe(false);
    });
  });

  describe('ExpiryRecordSchema', () => {
    it('should validate a complete expiry record', () => {
      const record = {
        barcode: '12345678',
        productName: 'Test Product',
        mm: 6,
        yyyy: 2026,
        quantity: 100
      };
      
      const result = safeValidate(ExpiryRecordSchema, record);
      expect(result.success).toBe(true);
    });

    it('should reject invalid month', () => {
      const record = {
        barcode: '12345678',
        productName: 'Test',
        mm: 13, // invalid
        yyyy: 2026
      };
      
      const result = safeValidate(ExpiryRecordSchema, record);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const record = {
        barcode: '12345678',
        productName: 'Test',
        mm: 6,
        yyyy: 2026,
        quantity: -5 // invalid
      };
      
      const result = safeValidate(ExpiryRecordSchema, record);
      expect(result.success).toBe(false);
    });
  });

  describe('validateBarcode helper', () => {
    it('should return barcode if valid', () => {
      expect(validateBarcode('12345678')).toBe('12345678');
    });

    it('should throw if invalid', () => {
      expect(() => validateBarcode('123')).toThrow();
    });
  });

  describe('validateRut helper', () => {
    it('should return RUT if valid', () => {
      expect(validateRut('12.345.678-9')).toBe('12.345.678-9');
    });

    it('should throw if invalid', () => {
      expect(() => validateRut('invalid')).toThrow();
    });
  });
});
