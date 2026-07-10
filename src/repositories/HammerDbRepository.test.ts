/**
 * HammerDbRepository Tests
 * Tests unitarios para el repositorio de datos de Hammer (conteo masivo)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HammerDbRepository } from './HammerDbRepository';
import { BlindScan } from '../types';

// Usar vi.hoisted para definir los mocks antes del hoisting de vi.mock
const mocks = vi.hoisted(() => {
  const toArrayFn = vi.fn();
  const countFn = vi.fn();
  const deleteFn = vi.fn();
  const firstFn = vi.fn();
  
  const createQueryBuilder = () => ({
    equals: vi.fn().mockReturnValue({
      toArray: toArrayFn,
      count: countFn,
      delete: deleteFn,
    }),
    toArray: toArrayFn,
  });
  
  const mockBlindScans = {
    where: vi.fn().mockImplementation(() => createQueryBuilder()),
    toArray: toArrayFn,
    count: countFn,
    bulkAdd: vi.fn(),
    add: vi.fn(),
    delete: deleteFn,
    orderBy: vi.fn().mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        first: firstFn,
      }),
    }),
    toCollection: vi.fn().mockReturnValue({
      first: firstFn,
    }),
    transaction: vi.fn(),
  };
  
  const mockBlindManifests = {
    where: vi.fn().mockImplementation(() => createQueryBuilder()),
    toArray: toArrayFn,
    count: countFn,
    delete: deleteFn,
    toCollection: vi.fn().mockReturnValue({
      first: firstFn,
    }),
  };
  
  return { mockBlindScans, mockBlindManifests, toArrayFn, countFn };
});

vi.mock('../db', () => ({
  hammerDb: {
    blindScans: mocks.mockBlindScans,
    blindManifests: mocks.mockBlindManifests,
  }
}));

describe('HammerDbRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockBlindScans.transaction.mockImplementation(async (mode, stores, callback) => {
      return await callback();
    });
  });

  describe('getBlindScansByBatch', () => {
    it('should return scans for a given batchId', async () => {
      const batchId = 'HM-TEST123';
      const mockScans: BlindScan[] = [
        { id: 1, batchId, barcode: 'SKU001', quantity: 5, location: 'ZONA-A', timestamp: Date.now() },
        { id: 2, batchId, barcode: 'SKU002', quantity: 3, location: 'ZONA-B', timestamp: Date.now() },
      ];
      mocks.mockBlindScans.toArray.mockResolvedValue(mockScans);
      const result = await HammerDbRepository.getBlindScansByBatch(batchId);
      expect(result).toEqual(mockScans);
    });

    it('should return empty array when no scans found', async () => {
      mocks.mockBlindScans.toArray.mockResolvedValue([]);
      const result = await HammerDbRepository.getBlindScansByBatch('EMPTY-BATCH');
      expect(result).toEqual([]);
    });
  });

  describe('bulkAddBlindScans', () => {
    it('should bulk add scans successfully', async () => {
      const scans = [
        { batchId: 'HM-TEST', barcode: 'SKU001', quantity: 5, location: 'ZONA-A', timestamp: Date.now() },
      ];
      mocks.mockBlindScans.bulkAdd.mockResolvedValue(undefined);
      await expect(HammerDbRepository.bulkAddBlindScans(scans)).resolves.not.toThrow();
      expect(mocks.mockBlindScans.bulkAdd).toHaveBeenCalledWith(scans);
    });

    it('should throw error when bulkAdd fails', async () => {
      const error = new Error('Bulk add failed');
      mocks.mockBlindScans.bulkAdd.mockRejectedValue(error);
      const scans = [
        { batchId: 'HM-TEST', barcode: 'SKU001', quantity: 5, location: 'ZONA-A', timestamp: Date.now() },
      ];
      await expect(HammerDbRepository.bulkAddBlindScans(scans)).rejects.toThrow('Bulk add failed');
    });
  });

  describe('getBatchCounts', () => {
    it('should return correct counts', async () => {
      // Configurar mocks específicos para este test
      mocks.mockBlindScans.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(5),
        }),
      });
      mocks.mockBlindManifests.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(3),
        }),
      });
      const result = await HammerDbRepository.getBatchCounts('HM-COUNTS');
      expect(result).toEqual({ scans: 5, manifests: 3 });
    });

    it('should return zero counts when no data', async () => {
      mocks.mockBlindScans.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
        }),
      });
      mocks.mockBlindManifests.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
        }),
      });
      const result = await HammerDbRepository.getBatchCounts('EMPTY-BATCH');
      expect(result).toEqual({ scans: 0, manifests: 0 });
    });
  });

  describe('getBatchSessionInfo', () => {
    it('should return hasData=false when no data', async () => {
      // Configurar mock para getBlindScansByBatch
      mocks.mockBlindScans.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });
      mocks.mockBlindManifests.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });
      const result = await HammerDbRepository.getBatchSessionInfo('NEW-SESSION');
      expect(result.hasData).toBe(false);
      expect(result.scans).toBe(0);
      expect(result.manifests).toBe(0);
    });

    it('should return hasData=true when has scans', async () => {
      const scans = [{ id: 1, batchId: 'B1', barcode: 'SKU001', quantity: 10, location: 'Z1', timestamp: 1000 }];
      mocks.mockBlindScans.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(scans),
        }),
      });
      mocks.mockBlindManifests.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });
      const result = await HammerDbRepository.getBatchSessionInfo('B1');
      expect(result.hasData).toBe(true);
      expect(result.totalScannedUnits).toBe(10);
    });
  });

  describe('getBatchSummary', () => {
    it('should combine scans and manifests', async () => {
      const scans = [{ id: 1, batchId: 'B1', barcode: 'SKU001', quantity: 10, location: 'Z1', timestamp: 1000 }];
      const manifests = [{ id: 1, batchId: 'B1', barcode: 'SKU001', expectedQty: 100, name: 'Product One' }];
      mocks.mockBlindScans.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(scans),
        }),
      });
      mocks.mockBlindManifests.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(manifests),
        }),
      });
      const result = await HammerDbRepository.getBatchSummary('B1');
      expect(result).toHaveLength(1);
      expect(result[0].barcode).toBe('SKU001');
      expect(result[0].expected).toBe(100);
      expect(result[0].name).toBe('Product One');
    });
  });
});
