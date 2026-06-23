/**
 * Slices Constants Tests
 *
 * Tests para las constantes del módulo de Slices.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_SLICES, TABLE_FIELDS, SLICE_STORAGE_KEY } from './defaultSlices';

describe('Slices Constants', () => {
  describe('DEFAULT_SLICES', () => {
    it('should have 4 default slices', () => {
      expect(DEFAULT_SLICES).toHaveLength(4);
    });

    it('should have all required system slices', () => {
      const sliceIds = DEFAULT_SLICES.map(s => s.id);
      
      expect(sliceIds).toContain('sys-scans-error');
      expect(sliceIds).toContain('sys-sessions-active');
      expect(sliceIds).toContain('sys-products-offline');
      expect(sliceIds).toContain('sys-vencimiento-alerta');
    });

    it('should have correct slice properties', () => {
      DEFAULT_SLICES.forEach(slice => {
        expect(slice).toHaveProperty('id');
        expect(slice).toHaveProperty('name');
        expect(slice).toHaveProperty('description');
        expect(slice).toHaveProperty('sourceTable');
        expect(slice).toHaveProperty('filterField');
        expect(slice).toHaveProperty('filterOperator');
        expect(slice).toHaveProperty('filterValue');
        expect(slice).toHaveProperty('selectedColumns');
        expect(slice).toHaveProperty('allowEdits');
        expect(slice).toHaveProperty('allowDeletes');
        expect(slice).toHaveProperty('isSystem');
      });
    });

    it('should have all system slices marked as isSystem: true', () => {
      DEFAULT_SLICES.forEach(slice => {
        expect(slice.isSystem).toBe(true);
      });
    });

    it('should have valid source tables', () => {
      const validTables = Object.keys(TABLE_FIELDS);
      
      DEFAULT_SLICES.forEach(slice => {
        expect(validTables).toContain(slice.sourceTable);
      });
    });

    it('should have valid selected columns for each slice', () => {
      DEFAULT_SLICES.forEach(slice => {
        const validFields = TABLE_FIELDS[slice.sourceTable];
        slice.selectedColumns.forEach(column => {
          expect(validFields).toContain(column);
        });
      });
    });

    it('should have non-empty names and descriptions', () => {
      DEFAULT_SLICES.forEach(slice => {
        expect(slice.name.length).toBeGreaterThan(0);
        expect(slice.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('TABLE_FIELDS', () => {
    it('should have fields for scans table', () => {
      expect(TABLE_FIELDS.scans).toContain('id');
      expect(TABLE_FIELDS.scans).toContain('barcode');
      expect(TABLE_FIELDS.scans).toContain('syncStatus');
    });

    it('should have fields for products table', () => {
      expect(TABLE_FIELDS.products).toContain('barcode');
      expect(TABLE_FIELDS.products).toContain('name');
      expect(TABLE_FIELDS.products).toContain('sku');
    });

    it('should have fields for sessions table', () => {
      expect(TABLE_FIELDS.sessions).toContain('id');
      expect(TABLE_FIELDS.sessions).toContain('status');
      expect(TABLE_FIELDS.sessions).toContain('syncStatus');
    });

    it('should have fields for providers table', () => {
      expect(TABLE_FIELDS.providers).toContain('id');
      expect(TABLE_FIELDS.providers).toContain('rut');
      expect(TABLE_FIELDS.providers).toContain('syncStatus');
    });

    it('should have fields for customers table', () => {
      expect(TABLE_FIELDS.customers).toContain('id');
      expect(TABLE_FIELDS.customers).toContain('rut');
      expect(TABLE_FIELDS.customers).toContain('syncStatus');
    });

    it('should have fields for dynamic_data table', () => {
      expect(TABLE_FIELDS.dynamic_data).toContain('id');
      expect(TABLE_FIELDS.dynamic_data).toContain('barcode');
      expect(TABLE_FIELDS.dynamic_data).toContain('tableName');
    });

    it('should have unique fields for each table', () => {
      Object.values(TABLE_FIELDS).forEach(fields => {
        const uniqueFields = new Set(fields);
        expect(uniqueFields.size).toBe(fields.length);
      });
    });

    it('should have all arrays (not undefined)', () => {
      expect(Array.isArray(TABLE_FIELDS.scans)).toBe(true);
      expect(Array.isArray(TABLE_FIELDS.products)).toBe(true);
      expect(Array.isArray(TABLE_FIELDS.sessions)).toBe(true);
    });
  });

  describe('SLICE_STORAGE_KEY', () => {
    it('should be a non-empty string', () => {
      expect(typeof SLICE_STORAGE_KEY).toBe('string');
      expect(SLICE_STORAGE_KEY.length).toBeGreaterThan(0);
    });

    it('should start with expected prefix', () => {
      expect(SLICE_STORAGE_KEY).toMatch(/^logicount_/);
    });

    it('should be specific to slices module', () => {
      expect(SLICE_STORAGE_KEY).toContain('slice');
    });
  });
});
