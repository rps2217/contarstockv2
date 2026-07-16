/**
 * Tests para syncRegistry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('@/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../settings', () => ({
  getSettings: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    }),
  },
}));

// Import after mocks
import { syncRegistry, type TableSyncMeta } from './syncRegistry';

import {
  getSyncTableConfig,
  getTargetTable,
  isBlindSessionId,
  SYNC_CONSTANTS,
} from '@/lib/syncConfig';

describe('syncRegistry', () => {
  describe('syncRegistry object', () => {
    it('should have required sync entries', () => {
      expect(syncRegistry).toBeDefined();
      expect(syncRegistry.products).toBeDefined();
      expect(syncRegistry.scans).toBeDefined();
    });

    it('should have correct local and remote table names', () => {
      expect(syncRegistry.products.localTable).toBe('products');
      expect(syncRegistry.products.remoteTable).toBe('PRODUCTOS');
    });

    it('should define primary keys for each table', () => {
      // products uses barcode as primary key
      expect(syncRegistry.products.primaryKey).toBe('barcode');
    });

    it('should have mapToRemote function for products', () => {
      expect(typeof syncRegistry.products.mapToRemote).toBe('function');
    });
  });

  describe('getSyncTableConfig', () => {
    it('should return table configuration object', () => {
      const config = getSyncTableConfig();

      expect(config).toBeDefined();
      expect(config.counts).toBe('CONTEOS');
      expect(config.products).toBe('PRODUCTOS');
    });

    it('should return correct table mappings', () => {
      const config = getSyncTableConfig();

      expect(typeof config.counts).toBe('string');
      expect(typeof config.products).toBe('string');
      expect(typeof config.orders).toBe('string');
    });
  });

  describe('getTargetTable', () => {
    it('should return correct remote table name', () => {
      expect(getTargetTable('counts')).toBe('CONTEOS');
      expect(getTargetTable('orders')).toBe('PEDIDOS');
    });

    it('should return undefined for unknown table', () => {
      expect(getTargetTable('unknown' as any)).toBeUndefined();
    });
  });

  describe('isBlindSessionId', () => {
    it('should identify blind session IDs correctly', () => {
      expect(isBlindSessionId('HM-12345678')).toBe(true);
      expect(isBlindSessionId('HM-ABCDEF12')).toBe(true);
      expect(isBlindSessionId('HM-A1B2C3D4')).toBe(true);
    });

    it('should return false for non-blind session IDs', () => {
      expect(isBlindSessionId('session-abc-123')).toBe(false);
      expect(isBlindSessionId('normal-id')).toBe(false);
      expect(isBlindSessionId('')).toBe(false);
    });
  });

  describe('SYNC_CONSTANTS', () => {
    it('should have required constants', () => {
      expect(SYNC_CONSTANTS.BATCH_PREFIX).toBe('HM-');
      expect(SYNC_CONSTANTS.BATCH_SIZE).toBe(100);
    });

    it('should have correct batch prefix', () => {
      expect(SYNC_CONSTANTS.BATCH_PREFIX.startsWith('HM')).toBe(true);
    });

    it('should have reasonable batch size', () => {
      expect(SYNC_CONSTANTS.BATCH_SIZE).toBeGreaterThan(0);
      expect(SYNC_CONSTANTS.BATCH_SIZE).toBeLessThanOrEqual(1000);
    });
  });

  describe('TableSyncMeta structure', () => {
    it('should support mapToRemote function', () => {
      const entry = syncRegistry.products;

      expect(typeof entry.mapToRemote).toBe('function');
    });

    it('should support mapToLocal function', () => {
      const entry = syncRegistry.products;

      expect(typeof entry.mapToLocal).toBe('function');
    });
  });
});
