import { describe, it, expect } from 'vitest';
import {
  ProductPolicyStatus,
  StockStatus,
  evaluateProductPolicy,
  evaluateStockStatus,
  normalizeText,
  productMatchesSearch,
  calculateProductStats,
  filterByPolicy,
  sortProducts,
  getPolicyLabel,
  getStockLabel
} from './productsDomain';
import { Product } from '@/types';

describe('productsDomain', () => {
  describe('ProductPolicyStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(ProductPolicyStatus.EXCHANGE).toBe('EXCHANGE');
      expect(ProductPolicyStatus.LOSS).toBe('LOSS');
      expect(ProductPolicyStatus.NO_INFO).toBe('NO_INFO');
      expect(ProductPolicyStatus.ALL).toBe('ALL');
    });
  });

  describe('StockStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(StockStatus.NORMAL).toBe('NORMAL');
      expect(StockStatus.LOW).toBe('LOW');
      expect(StockStatus.CRITICAL).toBe('CRITICAL');
      expect(StockStatus.EXCESS).toBe('EXCESS');
    });
  });

  describe('evaluateProductPolicy', () => {
    it('should return EXCHANGE when hasExchange is true', () => {
      const product = { barcode: '123', name: 'Test', hasExchange: true } as any;
      expect(evaluateProductPolicy(product)).toBe(ProductPolicyStatus.EXCHANGE);
    });

    it('should return LOSS when hasExchange is false', () => {
      const product = { barcode: '123', name: 'Test', hasExchange: false } as any;
      expect(evaluateProductPolicy(product)).toBe(ProductPolicyStatus.LOSS);
    });

    it('should return EXCHANGE when policy.daysToExpiry > 0', () => {
      const product = { 
        barcode: '123', 
        name: 'Test', 
        policy: { daysToExpiry: 30 } 
      } as any;
      expect(evaluateProductPolicy(product)).toBe(ProductPolicyStatus.EXCHANGE);
    });

    it('should return EXCHANGE when withdrawalDays > 0', () => {
      const product = { barcode: '123', name: 'Test', withdrawalDays: 30 } as any;
      expect(evaluateProductPolicy(product)).toBe(ProductPolicyStatus.EXCHANGE);
    });

    it('should return NO_INFO when no policy info', () => {
      const product = { barcode: '123', name: 'Test' } as any;
      expect(evaluateProductPolicy(product)).toBe(ProductPolicyStatus.NO_INFO);
    });
  });

  describe('evaluateStockStatus', () => {
    it('should return CRITICAL when stock is 0', () => {
      const product = { barcode: '123', name: 'Test', stock: 0 } as any;
      expect(evaluateStockStatus(product)).toBe(StockStatus.CRITICAL);
    });

    it('should return LOW when stock < minStock', () => {
      const product = { barcode: '123', name: 'Test', stock: 5, minStock: 10 } as any;
      expect(evaluateStockStatus(product)).toBe(StockStatus.LOW);
    });

    it('should return CRITICAL when stock < 50% of minStock', () => {
      const product = { barcode: '123', name: 'Test', stock: 3, minStock: 10 } as any;
      expect(evaluateStockStatus(product)).toBe(StockStatus.CRITICAL);
    });

    it('should return NORMAL when stock >= minStock', () => {
      const product = { barcode: '123', name: 'Test', stock: 15, minStock: 10 } as any;
      expect(evaluateStockStatus(product)).toBe(StockStatus.NORMAL);
    });

    it('should return EXCESS when stock > maxStock', () => {
      // Note: maxStock is calculated as stock * 1.5, so we test via ProductWithPolicy
      const product = { 
        barcode: '123', 
        name: 'Test', 
        stock: 100, 
        currentStock: 200 // Override to simulate excess
      } as any;
      expect(evaluateStockStatus(product)).toBe(StockStatus.EXCESS);
    });
  });

  describe('normalizeText', () => {
    it('should convert to uppercase', () => {
      expect(normalizeText('hello')).toBe('HELLO');
    });

    it('should remove accents', () => {
      expect(normalizeText('café')).toBe('CAFE');
      expect(normalizeText('niño')).toBe('NINO');
    });

    it('should trim whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('HELLO');
    });

    it('should handle empty and null strings', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('productMatchesSearch', () => {
    const mockProduct: Product = {
      barcode: '1234567890',
      name: 'PRODUCTO TEST',
      category: 'Electrónica',
      supplier: 'Supplier ABC',
      sku: 'SKU001',
      location: 'BOD.37'
    };

    it('should return true for empty query', () => {
      expect(productMatchesSearch(mockProduct, '')).toBe(true);
    });

    it('should match barcode', () => {
      expect(productMatchesSearch(mockProduct, '1234567890')).toBe(true);
      expect(productMatchesSearch(mockProduct, '123')).toBe(true);
      expect(productMatchesSearch(mockProduct, '999')).toBe(false);
    });

    it('should match name case-insensitively', () => {
      expect(productMatchesSearch(mockProduct, 'producto')).toBe(true);
      expect(productMatchesSearch(mockProduct, 'TEST')).toBe(true);
    });

    it('should match category', () => {
      expect(productMatchesSearch(mockProduct, 'Electrónica')).toBe(true);
    });

    it('should match multiple terms', () => {
      expect(productMatchesSearch(mockProduct, 'PRODUCTO BOD.37')).toBe(true);
    });
  });

  describe('calculateProductStats', () => {
    it('should calculate stats correctly', () => {
      const products: Product[] = [
        { barcode: '1', name: 'P1', hasExchange: true, stock: 5 } as any,
        { barcode: '2', name: 'P2', hasExchange: false, stock: 15 } as any,
        { barcode: '3', name: 'P3', stock: 0 } as any,
        { barcode: '4', name: 'P4', hasExchange: true, stock: 20 } as any,
      ];

      const stats = calculateProductStats(products);

      expect(stats.total).toBe(4);
      expect(stats.byPolicy[ProductPolicyStatus.EXCHANGE]).toBe(2);
      expect(stats.byPolicy[ProductPolicyStatus.LOSS]).toBe(1);
      expect(stats.byPolicy[ProductPolicyStatus.NO_INFO]).toBe(1);
      // P3 has stock=0 which is CRITICAL, P1 has stock=5 (no minStock so NORMAL)
      expect(stats.byStock[StockStatus.CRITICAL]).toBe(1);
    });

    it('should return zeros for empty array', () => {
      const stats = calculateProductStats([]);

      expect(stats.total).toBe(0);
      expect(stats.byPolicy[ProductPolicyStatus.EXCHANGE]).toBe(0);
      expect(stats.missingPolicy).toBe(0);
    });

    it('should count missing policy', () => {
      const products: Product[] = [
        { barcode: '1', name: 'P1' } as any,
        { barcode: '2', name: 'P2', hasExchange: true } as any,
      ];

      const stats = calculateProductStats(products);

      expect(stats.missingPolicy).toBe(1);
    });
  });

  describe('filterByPolicy', () => {
    const products: Product[] = [
      { barcode: '1', name: 'P1', hasExchange: true } as any,
      { barcode: '2', name: 'P2', hasExchange: false } as any,
      { barcode: '3', name: 'P3' } as any,
    ];

    it('should return all products for "all" filter', () => {
      const filtered = filterByPolicy(products, 'all');
      expect(filtered.length).toBe(3);
    });

    it('should filter by EXCHANGE', () => {
      const filtered = filterByPolicy(products, ProductPolicyStatus.EXCHANGE);
      expect(filtered.length).toBe(1);
      expect(filtered[0].barcode).toBe('1');
    });

    it('should filter by LOSS', () => {
      const filtered = filterByPolicy(products, ProductPolicyStatus.LOSS);
      expect(filtered.length).toBe(1);
      expect(filtered[0].barcode).toBe('2');
    });

    it('should filter by NO_INFO', () => {
      const filtered = filterByPolicy(products, ProductPolicyStatus.NO_INFO);
      expect(filtered.length).toBe(1);
      expect(filtered[0].barcode).toBe('3');
    });
  });

  describe('sortProducts', () => {
    const products: Product[] = [
      { barcode: '3', name: 'Gamma', stock: 10, category: 'A' } as any,
      { barcode: '1', name: 'Alpha', stock: 5, category: 'B' } as any,
      { barcode: '2', name: 'Beta', stock: 20, category: 'A' } as any,
    ];

    it('should sort by name ascending', () => {
      const sorted = sortProducts(products, 'name', 'asc');
      expect(sorted[0].name).toBe('Alpha');
      expect(sorted[1].name).toBe('Beta');
      expect(sorted[2].name).toBe('Gamma');
    });

    it('should sort by name descending', () => {
      const sorted = sortProducts(products, 'name', 'desc');
      expect(sorted[0].name).toBe('Gamma');
    });

    it('should sort by barcode', () => {
      const sorted = sortProducts(products, 'barcode', 'asc');
      expect(sorted[0].barcode).toBe('1');
    });

    it('should sort by stock', () => {
      const sorted = sortProducts(products, 'stock', 'asc');
      expect(sorted[0].stock).toBe(5);
    });
  });

  describe('getPolicyLabel', () => {
    it('should return correct labels', () => {
      expect(getPolicyLabel(ProductPolicyStatus.EXCHANGE)).toBe('Canje');
      expect(getPolicyLabel(ProductPolicyStatus.LOSS)).toBe('Merma');
      expect(getPolicyLabel(ProductPolicyStatus.NO_INFO)).toBe('Sin Info');
      expect(getPolicyLabel(ProductPolicyStatus.ALL)).toBe('Todos');
    });
  });

  describe('getStockLabel', () => {
    it('should return correct labels', () => {
      expect(getStockLabel(StockStatus.NORMAL)).toBe('Normal');
      expect(getStockLabel(StockStatus.LOW)).toBe('Bajo');
      expect(getStockLabel(StockStatus.CRITICAL)).toBe('Crítico');
      expect(getStockLabel(StockStatus.EXCESS)).toBe('Exceso');
    });
  });
});
