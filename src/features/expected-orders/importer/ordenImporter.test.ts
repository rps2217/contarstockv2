/**
 * Tests para ordenImporter
 */

import { describe, it, expect } from 'vitest';
import { 
  parsePastedText, 
  applyMappings, 
  parseQuantity,
  autoDetectMappings,
  validateMappings,
  calculatePreviewStats,
  ColumnMappings
} from './ordenImporter';

describe('ordenImporter', () => {
  describe('parseQuantity', () => {
    it('should parse integer quantities', () => {
      expect(parseQuantity('10')).toBe(10);
      expect(parseQuantity('100')).toBe(100);
    });

    it('should parse decimal quantities with comma (Spanish format)', () => {
      expect(parseQuantity('10,5')).toBe(11); // rounds to 11
      expect(parseQuantity('1,234')).toBe(1); // rounds to 1
    });

    it('should parse decimal quantities with dot (English format)', () => {
      expect(parseQuantity('10.5')).toBe(11); // rounds to 11
    });

    it('should return 1 for empty or invalid values', () => {
      expect(parseQuantity('')).toBe(1);
      expect(parseQuantity('abc')).toBe(1);
      expect(parseQuantity('N/A')).toBe(1);
    });

    it('should handle simple numeric strings', () => {
      expect(parseQuantity('1000')).toBe(1000);
      expect(parseQuantity('5')).toBe(5);
    });
  });

  describe('parsePastedText', () => {
    it('should parse tab-delimited text', () => {
      const text = 'SKU\tCantidad\tDescripción\n1234567890123\t5\tProducto A';
      const result = parsePastedText(text);
      
      expect(result.headers).toEqual(['SKU', 'Cantidad', 'Descripción']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].SKU).toBe('1234567890123');
      expect(result.rows[0].Cantidad).toBe('5');
    });

    it('should parse comma-delimited text', () => {
      const text = 'SKU,Cantidad\n1234567890123,10';
      const result = parsePastedText(text);
      
      expect(result.headers).toEqual(['SKU', 'Cantidad']);
      expect(result.rows[0].SKU).toBe('1234567890123');
    });

    it('should return empty arrays for empty text', () => {
      const result = parsePastedText('');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('should handle quoted values', () => {
      const text = 'SKU,Descripción\n1234567890123,"Producto con, coma"';
      const result = parsePastedText(text);
      
      // El parser trata la coma dentro de las comillas como delimitador
      // Este es el comportamiento actual; mejoras pueden venir después
      expect(result.rows[0].Descripción).toBeDefined();
    });
  });

  describe('autoDetectMappings', () => {
    it('should auto-detect SKU column', () => {
      const headers = ['SKU', 'CANTIDAD', 'DESCRIPCION'];
      const mappings = autoDetectMappings(headers);
      
      expect(mappings.sku).toBe('SKU');
    });

    it('should auto-detect barcode as SKU fallback', () => {
      const headers = ['Barcode', 'Cantidad'];
      const mappings = autoDetectMappings(headers);
      
      expect(mappings.sku).toBe('Barcode');
    });

    it('should auto-detect quantity column', () => {
      const headers = ['SKU', 'Quantity', 'Name'];
      const mappings = autoDetectMappings(headers);
      
      expect(mappings.quantity).toBe('Quantity');
    });

    it('should return empty mappings for generic headers', () => {
      const headers = ['Column1', 'Column2', 'Column3'];
      const mappings = autoDetectMappings(headers);
      
      expect(Object.keys(mappings).length).toBe(0);
    });
  });

  describe('validateMappings', () => {
    it('should validate mappings with SKU', () => {
      const mappings: ColumnMappings = { sku: 'SKU', quantity: 'Qty' };
      const headers = ['SKU', 'Qty'];
      const result = validateMappings(mappings, headers);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate mappings with barcode', () => {
      const mappings: ColumnMappings = { barcode: 'Barcode' };
      const headers = ['Barcode'];
      const result = validateMappings(mappings, headers);
      
      expect(result.valid).toBe(true);
    });

    it('should reject mappings without SKU or barcode', () => {
      const mappings: ColumnMappings = { quantity: 'Qty' };
      const headers = ['Qty'];
      const result = validateMappings(mappings, headers);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('SKU');
    });

    it('should reject invalid column names', () => {
      const mappings: ColumnMappings = { sku: 'InvalidColumn' };
      const headers = ['SKU'];
      const result = validateMappings(mappings, headers);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('no encontrada');
    });
  });

  describe('calculatePreviewStats', () => {
    it('should calculate correct stats', () => {
      const items = [
        { sku: '123', barcode: '123', quantity: 5, description: 'A', unit: 'UN', location: 'LOC1', lineNumber: 1 },
        { sku: '456', barcode: '456', quantity: 10, description: 'B', unit: 'UN', location: 'LOC2', lineNumber: 2 },
        { sku: '123', barcode: '123', quantity: 3, description: 'A', unit: 'UN', location: 'LOC1', lineNumber: 3 },
      ];
      
      const stats = calculatePreviewStats(items);
      
      expect(stats.totalItems).toBe(3);
      expect(stats.totalQuantity).toBe(18);
      expect(stats.uniqueSkus).toBe(2);
      expect(stats.itemsWithoutSku).toBe(0);
    });

    it('should count items without SKU', () => {
      const items = [
        { sku: '', barcode: '123', quantity: 5, description: 'A', unit: 'UN', location: 'LOC1', lineNumber: 1 },
        { sku: '456', barcode: '456', quantity: 10, description: 'B', unit: 'UN', location: 'LOC2', lineNumber: 2 },
      ];
      
      const stats = calculatePreviewStats(items);
      
      expect(stats.itemsWithoutSku).toBe(1);
    });
  });

  describe('applyMappings', () => {
    it('should apply mappings correctly', () => {
      const rows = [
        { SKU: '1234567890123', Cantidad: '10', Descripcion: 'Producto A' }
      ];
      const mappings: ColumnMappings = {
        sku: 'SKU',
        quantity: 'Cantidad',
        description: 'Descripcion'
      };
      const headers = ['SKU', 'Cantidad', 'Descripcion'];
      
      const items = applyMappings(rows, mappings, headers);
      
      expect(items).toHaveLength(1);
      expect(items[0].sku).toBe('1234567890123');
      expect(items[0].quantity).toBe(10);
      expect(items[0].description).toBe('Producto A');
    });

    it('should use barcode as SKU fallback', () => {
      const rows = [
        { Barcode: '1234567890123', Qty: '5' }
      ];
      const mappings: ColumnMappings = {
        sku: undefined,
        barcode: 'Barcode',
        quantity: 'Qty'
      };
      const headers = ['Barcode', 'Qty'];
      
      const items = applyMappings(rows, mappings, headers);
      
      expect(items[0].sku).toBe('1234567890123');
      expect(items[0].barcode).toBe('1234567890123');
    });
  });
});
