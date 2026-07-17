/**
 * Counting Domain Tests - Funciones puras del módulo de conteo
 *
 * Tests para las funciones de dominio en countingDomain.ts
 * Estas son funciones stateless, ideales para unit testing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  type ConsolidatedItem,
} from './countingDomain';

// Mock de normalizeSku
vi.mock('@/services/utils', () => ({
  normalizeSku: (sku: string) => sku.trim(),
}));

// Mock de constantes de expiry
vi.mock('@/features/expiry/constants', () => ({
  MIN_YEAR: 2024,
  MAX_YEAR: 2027,
}));

// Helper para crear ConsolidatedItem mock
const createMockItem = (overrides: Partial<ConsolidatedItem> = {}): ConsolidatedItem => ({
  barcode: '7801234567890',
  productName: 'Producto Test',
  totalQuantity: 10,
  isIncident: false,
  ...overrides,
});

describe('countingDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // isPharmaBarcode
  // =========================================================================
  describe('isPharmaBarcode', () => {
    it('debería retornar true para códigos que empiezan con 780', () => {
      expect(isPharmaBarcode('7801234567890')).toBe(true);
      expect(isPharmaBarcode('780')).toBe(true);
    });

    it('debería retornar true para códigos que empiezan con 789', () => {
      expect(isPharmaBarcode('7891234567890')).toBe(true);
    });

    it('debería retornar true para códigos que empiezan con 750', () => {
      expect(isPharmaBarcode('7501234567890')).toBe(true);
    });

    it('debería retornar true para códigos que empiezan con 071', () => {
      expect(isPharmaBarcode('0711234567890')).toBe(true);
    });

    it('debería retornar false para códigos no farmacéuticos', () => {
      expect(isPharmaBarcode('1234567890123')).toBe(false);
      expect(isPharmaBarcode('abcdefghijkl')).toBe(false);
    });

    it('debería manejar espacios en blanco', () => {
      expect(isPharmaBarcode('  7801234567890  ')).toBe(true);
    });
  });

  // =========================================================================
  // evaluateProduct
  // =========================================================================
  describe('evaluateProduct', () => {
    it('debería evaluar producto nuevo como alta confianza', () => {
      const result = evaluateProduct('7801234567890', undefined);
      expect(result.isNew).toBe(true);
      expect(result.isPharma).toBe(true);
      expect(result.confidence).toBe('medium');
    });

    it('debería evaluar producto existente como alta confianza', () => {
      const existing = createMockItem();
      const result = evaluateProduct('7801234567890', existing);
      expect(result.isNew).toBe(false);
      expect(result.confidence).toBe('high');
    });

    it('debería identificar productos farma', () => {
      const result = evaluateProduct('7801234567890', undefined);
      expect(result.isPharma).toBe(true);
      expect(result.needsBatch).toBe(true);
    });

    it('debería no requerir batch si settings lo indican', () => {
      const result = evaluateProduct('7801234567890', undefined, { pharmaBatchRequired: false });
      expect(result.needsBatch).toBe(false);
    });

    it('debería evaluar productos no farma con baja confianza si son nuevos', () => {
      const result = evaluateProduct('1234567890123', undefined);
      expect(result.isPharma).toBe(false);
      expect(result.confidence).toBe('low');
    });
  });

  // =========================================================================
  // shouldPromptBatch
  // =========================================================================
  describe('shouldPromptBatch', () => {
    it('debería retornar null para productos no farma', () => {
      const result = shouldPromptBatch('1234567890123', []);
      expect(result).toBeNull();
    });

    it('debería retornar null si pharmaBatchRequired es false', () => {
      const result = shouldPromptBatch('7801234567890', [], { pharmaBatchRequired: false });
      expect(result).toBeNull();
    });

    it('debería retornar prompt si producto farma no tiene batch', () => {
      const history = [createMockItem({ barcode: '7801234567890' })];
      const result = shouldPromptBatch('7801234567890', history);
      expect(result).not.toBeNull();
      expect(result?.barcode).toBe('7801234567890');
      expect(result?.reason).toContain('farmacéuticos');
    });

    it('debería retornar null si producto ya tiene batch', () => {
      const history = [createMockItem({ barcode: '7801234567890', batch: 'LOTE001' })];
      const result = shouldPromptBatch('7801234567890', history);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // calculateCountingMetrics
  // =========================================================================
  describe('calculateCountingMetrics', () => {
    it('debería retornar ceros para array vacío', () => {
      const result = calculateCountingMetrics([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.uniqueProducts).toBe(0);
      expect(result.incidents).toBe(0);
      expect(result.expectedCoverage).toBe(0);
    });

    it('debería calcular métricas correctamente', () => {
      const items = [
        createMockItem({ barcode: '123', totalQuantity: 10 }),
        createMockItem({ barcode: '123', totalQuantity: 5 }),
        createMockItem({ barcode: '456', totalQuantity: 3, isIncident: true }),
      ];
      const result = calculateCountingMetrics(items);
      expect(result.totalItems).toBe(3);
      expect(result.totalQuantity).toBe(18);
      expect(result.uniqueProducts).toBe(2);
      expect(result.incidents).toBe(1);
    });

    it('debería calcular coverage si hay expectedQuantity', () => {
      const items = [
        createMockItem({ barcode: '123', totalQuantity: 50, expectedQuantity: 100 }),
        createMockItem({ barcode: '456', totalQuantity: 25, expectedQuantity: 50 }),
      ];
      const result = calculateCountingMetrics(items);
      expect(result.expectedCoverage).toBe(50); // 75/150 = 50%
    });

    it('debería limitar coverage a 100%', () => {
      const items = [createMockItem({ totalQuantity: 150, expectedQuantity: 100 })];
      const result = calculateCountingMetrics(items);
      expect(result.expectedCoverage).toBe(100);
    });
  });

  // =========================================================================
  // calculateProgress
  // =========================================================================
  describe('calculateProgress', () => {
    it('debería retornar 0 para array vacío', () => {
      expect(calculateProgress([])).toBe(0);
    });

    it('debería retornar 0 si no hay expectedQuantity', () => {
      const items = [createMockItem({ totalQuantity: 10 })];
      expect(calculateProgress(items)).toBe(0);
    });

    it('debería calcular progreso correctamente', () => {
      const items = [createMockItem({ totalQuantity: 50, expectedQuantity: 100 })];
      expect(calculateProgress(items)).toBe(50);
    });

    it('debería limitar a 100%', () => {
      const items = [createMockItem({ totalQuantity: 150, expectedQuantity: 100 })];
      expect(calculateProgress(items)).toBe(100);
    });
  });

  // =========================================================================
  // findItemByBarcode
  // =========================================================================
  describe('findItemByBarcode', () => {
    it('debería encontrar item por barcode', () => {
      const items = [createMockItem({ barcode: '123' })];
      const result = findItemByBarcode(items, '123');
      expect(result).toBeDefined();
      expect(result?.barcode).toBe('123');
    });

    it('debería retornar undefined si no encuentra', () => {
      const items = [createMockItem({ barcode: '123' })];
      const result = findItemByBarcode(items, '456');
      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // isSameProduct
  // =========================================================================
  describe('isSameProduct', () => {
    it('debería retornar true para mismos productos', () => {
      expect(isSameProduct('123', '123')).toBe(true);
    });

    it('debería retornar false para productos diferentes', () => {
      expect(isSameProduct('123', '456')).toBe(false);
    });
  });

  // =========================================================================
  // isValidBarcode
  // =========================================================================
  describe('isValidBarcode', () => {
    it('debería validar barcodes correctos', () => {
      expect(isValidBarcode('12345678')).toBe(true);
      expect(isValidBarcode('1234')).toBe(true);
      expect(isValidBarcode('12345678901234567890')).toBe(true);
    });

    it('debería rechazar barcodes muy cortos', () => {
      expect(isValidBarcode('123')).toBe(false);
      expect(isValidBarcode('')).toBe(false);
    });

    it('debería rechazar barcodes muy largos', () => {
      expect(isValidBarcode('123456789012345678901')).toBe(false);
    });

    it('debería rechazar valores no string', () => {
      expect(isValidBarcode(null as any)).toBe(false);
      expect(isValidBarcode(undefined as any)).toBe(false);
    });
  });

  // =========================================================================
  // isValidQuantity
  // =========================================================================
  describe('isValidQuantity', () => {
    it('debería validar cantidades correctas', () => {
      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(100)).toBe(true);
      expect(isValidQuantity(9999)).toBe(true);
    });

    it('debería rechazar cantidades inválidas', () => {
      expect(isValidQuantity(0)).toBe(false);
      expect(isValidQuantity(-1)).toBe(false);
      expect(isValidQuantity(10000)).toBe(false);
      expect(isValidQuantity(1.5)).toBe(false);
    });
  });

  // =========================================================================
  // isValidExpiryDate
  // =========================================================================
  describe('isValidExpiryDate', () => {
    it('debería validar fechas correctas', () => {
      expect(isValidExpiryDate(1, 2025)).toBe(true);
      expect(isValidExpiryDate(12, 2026)).toBe(true);
      expect(isValidExpiryDate(6, 2024)).toBe(true);
    });

    it('debería rechazar meses inválidos', () => {
      expect(isValidExpiryDate(0, 2025)).toBe(false);
      expect(isValidExpiryDate(13, 2025)).toBe(false);
    });

    it('debería rechazar años fuera de rango', () => {
      expect(isValidExpiryDate(6, 2023)).toBe(false);
      expect(isValidExpiryDate(6, 2028)).toBe(false);
    });
  });

  // =========================================================================
  // formatBarcode
  // =========================================================================
  describe('formatBarcode', () => {
    it('debería formatear barcodes EAN-13', () => {
      const result = formatBarcode('1234567890123');
      expect(result).toBe('1 234567 890123');
    });

    it('debería retornar - para barcode vacío', () => {
      expect(formatBarcode('')).toBe('-');
    });

    it('debería retornar barcode original para otros formatos', () => {
      expect(formatBarcode('12345678')).toBe('12345678');
    });
  });

  // =========================================================================
  // getCountingSummary
  // =========================================================================
  describe('getCountingSummary', () => {
    it('debería retornar mensaje para array vacío', () => {
      expect(getCountingSummary([])).toBe('Sin productos contados');
    });

    it('debería formatear resumen correctamente', () => {
      const items = [
        createMockItem({ barcode: '123', totalQuantity: 10 }),
        createMockItem({ barcode: '456', totalQuantity: 5 }),
      ];
      const result = getCountingSummary(items);
      expect(result).toContain('2 productos');
      expect(result).toContain('15 unidades');
    });

    it('debería usar singular correctamente', () => {
      const items = [createMockItem({ barcode: '123', totalQuantity: 10 })];
      const result = getCountingSummary(items);
      expect(result).toContain('1 producto');
      expect(result).toContain('10 unidades');
    });
  });
});
