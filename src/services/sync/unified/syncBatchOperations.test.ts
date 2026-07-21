/**
 * Tests para syncBatchOperations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
  },
}));

// Mock syncMetricsService
vi.mock('./SyncMetricsService', () => ({
  syncMetricsService: {
    recordMetric: vi.fn(),
  },
}));

// Mock registry
vi.mock('./registry', () => ({
  syncRegistry: {
    products: {
      localTable: 'products',
      remoteTable: 'productos',
      primaryKey: 'id',
      mapToRemote: vi.fn(item => ({ ...item, sku: item.barcode })),
    },
    inventory: {
      localTable: 'inventory',
      remoteTable: 'inventarios',
      primaryKey: 'id',
    },
  },
}));

// Mock syncHelpers
vi.mock('./syncHelpers', () => ({
  formatError: vi.fn(e => String(e)),
  extractColumnNameFromError: vi.fn((msg: string) => {
    if (msg.includes("column 'price'")) return 'price';
    if (msg.includes("column 'sku'")) return 'sku';
    return null;
  }),
}));

// Importar después de los mocks
import { supabase } from '@/lib/supabase';
import { syncMetricsService } from './SyncMetricsService';
import { executeBatchUpsert, executeSingleUpsert, recordBatchMetric } from './syncBatchOperations';

describe('syncBatchOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeSingleUpsert', () => {
    it('should upsert a single record', async () => {
      (supabase.from('productos').upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await executeSingleUpsert('products', {
        id: 1,
        barcode: '12345',
        name: 'Test Product',
      });

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(1);
      expect(supabase.from).toHaveBeenCalledWith('productos');
    });

    it('should return error for unknown table', async () => {
      const result = await executeSingleUpsert('unknown_table', { id: 1 });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown table');
    });

    it('should handle upsert error', async () => {
      (supabase.from('productos').upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      const result = await executeSingleUpsert('products', { id: 1 });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });
  });

  describe('executeBatchUpsert', () => {
    it('should upsert batch of records', async () => {
      (supabase.from('productos').upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: null,
        count: 3,
      });

      const rows = [
        { id: 1, barcode: '123' },
        { id: 2, barcode: '456' },
        { id: 3, barcode: '789' },
      ];

      const result = await executeBatchUpsert('products', rows);

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(3);
    });

    it('should return error for unknown table', async () => {
      const result = await executeBatchUpsert('unknown_table', [{ id: 1 }]);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown table');
    });

    it('should handle upsert error', async () => {
      (supabase.from('productos').upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      const result = await executeBatchUpsert('products', [{ id: 1 }]);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Server error');
    });

    it('should record metrics on success', async () => {
      (supabase.from('productos').upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: null,
        count: 2,
      });

      await executeBatchUpsert('products', [{ id: 1 }, { id: 2 }]);

      expect(syncMetricsService.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'batch_push',
          success: true,
          recordsAffected: 2,
        })
      );
    });

    it('should record metrics on error', async () => {
      (supabase.from('productos').upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await executeBatchUpsert('products', [{ id: 1 }]);

      expect(syncMetricsService.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'batch_push',
          success: false,
          error: 'Insert failed',
        })
      );
    });
  });

  describe('recordBatchMetric', () => {
    it('should record batch metrics', () => {
      recordBatchMetric({
        tableName: 'products',
        duration: 100,
        success: true,
        recordsAffected: 5,
      });

      expect(syncMetricsService.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'batch_push',
          tableName: 'products',
          duration: 100,
          success: true,
          recordsAffected: 5,
        })
      );
    });

    it('should handle metric service error gracefully', () => {
      (syncMetricsService.recordMetric as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Metrics service error');
      });

      // Should not throw
      expect(() =>
        recordBatchMetric({
          tableName: 'products',
          duration: 100,
          success: true,
          recordsAffected: 5,
        })
      ).not.toThrow();
    });
  });
});
