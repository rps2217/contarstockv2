/**
 * Counting Domain Tests - Pruebas unitarias para la lógica de negocio
 */

import { describe, it, expect } from 'vitest';
import {
  isPharmaBarcode,
  evaluateProduct,
  shouldPromptBatch,
  calculateCountingMetrics,
  calculateProgress,
  findItemByBarcode,
  isSameProduct,
  isValidBarcode,
  isValidQuantity,
  isValidExpiryDate,
  formatBarcode,
  getCountingSummary,
} from './countingDomain';

describe('CountingDomain', () => {
  describe('isPharmaBarcode', () => {
    it('should return true for pharma prefixes', () => {
      expect(isPharmaBarcode('7801234567890')).toBe(true);
      expect(isPharmaBarcode('7891234567890')).toBe(true);
      expect(isPharmaBarcode('7501234567890')).toBe(true);
      expect(isPharmaBarcode('0711234567890')).toBe(true);
    });

    it('should return false for non-pharma barcodes', () => {
      expect(isPharmaBarcode('1234567890123')).toBe(false);
      expect(isPharmaBarcode('5001234567890')).toBe(false);
    });

    it('should normalize barcode before checking', () => {
      expect(isPharmaBarcode('780-ABC-123')).toBe(true);
    });
  });

  describe('evaluateProduct', () => {
    it('should mark new products correctly', () => {
      const result = evaluateProduct('1234567890123', undefined);
      expect(result.isNew).toBe(true);
      expect(result.confidence).toBe('low');
    });

    it('should mark existing products correctly', () => {
      const existingItem = {
        barcode: '1234567890123',
        productName: 'Test Product',
        totalQuantity: 10,
        scans: 1,
      };
      const result = evaluateProduct('1234567890123', existingItem);
      expect(result.isNew).toBe(false);
      expect(result.confidence).toBe('high');
    });

    it('should mark pharma products', () => {
      const result = evaluateProduct('7801234567890', undefined);
      expect(result.isPharma).toBe(true);
      expect(result.needsBatch).toBe(true);
    });

    it('should respect pharmaBatchRequired setting', () => {
      const result = evaluateProduct('7801234567890', undefined, { pharmaBatchRequired: false });
      expect(result.needsBatch).toBe(false);
    });
  });

  describe('shouldPromptBatch', () => {
    it('should return null for non-pharma products', () => {
      const result = shouldPromptBatch('1234567890123', []);
      expect(result).toBeNull();
    });

    it('should return BatchPrompt for pharma products', () => {
      const result = shouldPromptBatch('7801234567890', []);
      expect(result).not.toBeNull();
      expect(result?.barcode).toBe('7801234567890');
      expect(result?.reason).toContain('lote');
    });

    it('should return null if pharma product already has batch', () => {
      const history = [{
        barcode: '7801234567890',
        productName: 'Test Pharma',
        totalQuantity: 5,
        scans: 1,
        batch: 'LOTE123',
      }];
      const result = shouldPromptBatch('7801234567890', history);
      expect(result).toBeNull();
    });
  });

  describe('calculateCountingMetrics', () => {
    it('should return zeros for empty array', () => {
      const result = calculateCountingMetrics([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.uniqueProducts).toBe(0);
      expect(result.incidents).toBe(0);
    });

    it('should calculate correct totals', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 5, scans: 1 },
        { barcode: '123', productName: 'A', totalQuantity: 10, scans: 2 },
        { barcode: '456', productName: 'B', totalQuantity: 3, scans: 1 },
      ];
      const result = calculateCountingMetrics(items);
      expect(result.totalItems).toBe(3);
      expect(result.totalQuantity).toBe(18);
      expect(result.uniqueProducts).toBe(2);
    });

    it('should count incidents', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 5, scans: 1, isIncident: true },
        { barcode: '456', productName: 'B', totalQuantity: 3, scans: 1, isIncident: false },
      ];
      const result = calculateCountingMetrics(items);
      expect(result.incidents).toBe(1);
    });

    it('should calculate expected coverage', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 8, scans: 1, expectedQuantity: 10 },
        { barcode: '456', productName: 'B', totalQuantity: 5, scans: 1, expectedQuantity: 5 },
      ];
      const result = calculateCountingMetrics(items);
      expect(result.expectedCoverage).toBe(87); // (8+5)/(10+5) = 87%
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 for empty array', () => {
      expect(calculateProgress([])).toBe(0);
    });

    it('should return 0 for items without expectedQuantity', () => {
      const items = [{ barcode: '123', productName: 'A', totalQuantity: 5, scans: 1 }];
      expect(calculateProgress(items)).toBe(0);
    });

    it('should calculate progress correctly', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 5, scans: 1, expectedQuantity: 10 },
        { barcode: '456', productName: 'B', totalQuantity: 5, scans: 1, expectedQuantity: 5 },
      ];
      expect(calculateProgress(items)).toBe(67); // (5+5)/(10+5) = 67%
    });

    it('should cap at 100%', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 20, scans: 1, expectedQuantity: 10 },
      ];
      expect(calculateProgress(items)).toBe(100);
    });
  });

  describe('findItemByBarcode', () => {
    const items = [
      { barcode: '123-ABC', productName: 'A', totalQuantity: 5, scans: 1 },
      { barcode: '456-DEF', productName: 'B', totalQuantity: 3, scans: 1 },
    ];

    it('should find item by barcode', () => {
      const result = findItemByBarcode(items, '123-ABC');
      expect(result).toBeDefined();
      expect(result?.productName).toBe('A');
    });

    it('should normalize barcode before search', () => {
      const result = findItemByBarcode(items, '123-abc');
      expect(result).toBeDefined();
    });

    it('should return undefined for non-existent barcode', () => {
      const result = findItemByBarcode(items, '999');
      expect(result).toBeUndefined();
    });
  });

  describe('isSameProduct', () => {
    it('should return true for identical barcodes', () => {
      expect(isSameProduct('123', '123')).toBe(true);
    });

    it('should return true for normalized match', () => {
      expect(isSameProduct('123-ABC', '123abc')).toBe(true);
    });

    it('should return false for different barcodes', () => {
      expect(isSameProduct('123', '456')).toBe(false);
    });
  });

  describe('isValidBarcode', () => {
    it('should return true for valid barcodes', () => {
      expect(isValidBarcode('1234567890123')).toBe(true);
      expect(isValidBarcode('1234')).toBe(true);
    });

    it('should return false for invalid barcodes', () => {
      expect(isValidBarcode('')).toBe(false);
      expect(isValidBarcode('123')).toBe(false); // too short
      expect(isValidBarcode('123456789012345678901')).toBe(false); // too long
    });
  });

  describe('isValidQuantity', () => {
    it('should return true for valid quantities', () => {
      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(100)).toBe(true);
      expect(isValidQuantity(9999)).toBe(true);
    });

    it('should return false for invalid quantities', () => {
      expect(isValidQuantity(0)).toBe(false);
      expect(isValidQuantity(-1)).toBe(false);
      expect(isValidQuantity(1.5)).toBe(false);
      expect(isValidQuantity(10000)).toBe(false);
    });
  });

  describe('isValidExpiryDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidExpiryDate(1, 2025)).toBe(true);
      expect(isValidExpiryDate(12, 2030)).toBe(true);
    });

    it('should return false for invalid month', () => {
      expect(isValidExpiryDate(0, 2025)).toBe(false);
      expect(isValidExpiryDate(13, 2025)).toBe(false);
    });

    it('should return false for invalid year', () => {
      expect(isValidExpiryDate(1, 2019)).toBe(false);
      expect(isValidExpiryDate(1, 2051)).toBe(false);
    });
  });

  describe('formatBarcode', () => {
    it('should format EAN-13 barcodes', () => {
      const result = formatBarcode('7801234567890');
      expect(result).toBe('7 801234 567890');
    });

    it('should return barcode as-is for non-EAN-13', () => {
      expect(formatBarcode('123456')).toBe('123456');
    });

    it('should return dash for empty barcode', () => {
      expect(formatBarcode('')).toBe('-');
    });
  });

  describe('getCountingSummary', () => {
    it('should return message for empty array', () => {
      expect(getCountingSummary([])).toBe('Sin productos contados');
    });

    it('should format summary correctly', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 5, scans: 1 },
        { barcode: '456', productName: 'B', totalQuantity: 10, scans: 1 },
      ];
      const result = getCountingSummary(items);
      expect(result).toContain('2 productos');
      expect(result).toContain('15 unidades');
    });

    it('should handle singular correctly', () => {
      const items = [
        { barcode: '123', productName: 'A', totalQuantity: 5, scans: 1 },
      ];
      const result = getCountingSummary(items);
      expect(result).toContain('1 producto');
      expect(result).toContain('5 unidades');
    });
  });
});
