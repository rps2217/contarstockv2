/**
 * Tests para syncMappingHelpers
 */

import { describe, it, expect } from 'vitest';
import {
  getSafeTimestamp,
  applyRemoteMapping,
  applyLocalMapping,
  createDynamicTableMappers,
} from './syncMappingHelpers';

describe('syncMappingHelpers', () => {
  describe('getSafeTimestamp', () => {
    it('should convert ISO string to timestamp', () => {
      const result = getSafeTimestamp('2024-01-15T10:30:00Z');
      expect(result).toBe(new Date('2024-01-15T10:30:00Z').getTime());
    });

    it('should return Date.now() for undefined', () => {
      const before = Date.now();
      const result = getSafeTimestamp(undefined);
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('should return Date.now() for invalid date', () => {
      const before = Date.now();
      const result = getSafeTimestamp('invalid-date');
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('applyRemoteMapping', () => {
    it('should apply mapping correctly', () => {
      const data = { barcode: '123', quantity: 5 };
      const mapping = { barcode: 'cod_barra', quantity: 'cantidad' };
      const result = applyRemoteMapping(data, mapping, 'id-1', 1700000000000);

      expect(result.cod_barra).toBe('123');
      expect(result.cantidad).toBe(5);
      expect(result.id).toBe('id-1');
      expect(result.updated_at).toBeDefined();
    });

    it('should handle undefined mapping', () => {
      const data = { name: 'Test' };
      const result = applyRemoteMapping(data, undefined, 'id-1', 1700000000000);

      expect(result.name).toBe('Test');
      expect(result.id).toBe('id-1');
    });

    it('should convert quantity to number', () => {
      const data = { quantity: '5' };
      const mapping = { quantity: 'cantidad' };
      const result = applyRemoteMapping(data, mapping, 'id-1', 1700000000000);

      expect(result.cantidad).toBe(5);
    });
  });

  describe('applyLocalMapping', () => {
    it('should return object with tableName and data', () => {
      const remote = { cod_barra: '123', cantidad: 5 };
      const mapping = { barcode: 'cod_barra', quantity: 'cantidad' };
      const result = applyLocalMapping(remote, mapping, 'id-1', 1700000000000, 'TEST') as Record<
        string,
        unknown
      >;

      expect(result.tableName).toBe('TEST');
      expect(result.id).toBe('id-1');
      expect(result.syncStatus).toBe('synced');
      expect(result.data).toBeDefined();
    });

    it('should handle no mapping', () => {
      const remote = { name: 'Test', value: 123 };
      const result = applyLocalMapping(remote, undefined, 'id-1', 1700000000000, 'TEST');

      expect(result.id).toBe('id-1');
      expect(result.tableName).toBe('TEST');
      expect(result.syncStatus).toBe('synced');
    });
  });

  describe('createDynamicTableMappers', () => {
    it('should create mappers for dynamic tables', () => {
      const mappers = createDynamicTableMappers('VENCIMIENTOS', 'expiry');

      expect(mappers.mapToRemote).toBeDefined();
      expect(mappers.mapToLocal).toBeDefined();
    });
  });
});
