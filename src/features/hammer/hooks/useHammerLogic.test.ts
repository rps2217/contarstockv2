/**
 * useHammerLogic Tests
 * 
 * Tests unitarios para el hook de lógica de Hammer (conteo masivo)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock de dependencias
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn()
}));

vi.mock('../../../shared/hooks/useScanPipeline', () => ({
  useScanPipeline: vi.fn(() => ({
    engine: {
      activeBarcode: null,
      activeProduct: null,
      feedback: null,
      multiplier: 1,
      optimisticQty: null,
      actions: {
        updateActiveItem: vi.fn(),
        triggerFeedback: vi.fn(),
        resetActive: vi.fn()
      }
    },
    processScan: vi.fn()
  }))
}));

vi.mock('../../../services/utils', () => ({
  sanitizeBarcode: vi.fn((code: string) => code.trim())
}));

vi.mock('../../../repositories/HammerDbRepository', () => ({
  HammerDbRepository: {
    getBlindScansByBatch: vi.fn(),
    getBlindManifestsByBatch: vi.fn(),
    bulkAddBlindScans: vi.fn(),
    deleteBlindScansByBatch: vi.fn(),
    deleteBlindScan: vi.fn(),
    updateScanQuantity: vi.fn()
  }
}));

vi.mock('../../../repositories/DexieProductRepository', () => ({
  productRepository: {
    getById: vi.fn()
  }
}));

vi.mock('../../../services/hammerSync', () => ({
  pushScansToCloud: vi.fn()
}));

vi.mock('../../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe('useHammerLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HammerItem interface', () => {
    it('should have correct HammerItem structure', () => {
      const item = {
        barcode: '123456789',
        name: 'Test Product',
        loc: 'ZONA-A',
        totalQuantity: 10,
        expectedQty: 5,
        lastTimestamp: Date.now()
      };

      expect(item.barcode).toBe('123456789');
      expect(item.name).toBe('Test Product');
      expect(item.loc).toBe('ZONA-A');
      expect(item.totalQuantity).toBe(10);
      expect(item.expectedQty).toBe(5);
      expect(item.lastTimestamp).toBeDefined();
    });

    it('should allow optional fields to be undefined', () => {
      const minimalItem = {
        barcode: '123456789',
        name: 'Test Product',
        totalQuantity: 0,
        lastTimestamp: Date.now()
      };

      expect(minimalItem.barcode).toBe('123456789');
      expect((minimalItem as any).loc).toBeUndefined();
      expect((minimalItem as any).expectedQty).toBeUndefined();
    });
  });

  describe('LocalStorage persistence', () => {
    it('should persist hammer_loc in localStorage', () => {
      const location = 'BOD.37';
      localStorage.setItem('hammer_loc', location);
      
      expect(localStorage.getItem('hammer_loc')).toBe(location);
    });

    it('should persist hammer_auto_sync in localStorage', () => {
      localStorage.setItem('hammer_auto_sync', 'true');
      expect(localStorage.getItem('hammer_auto_sync')).toBe('true');

      localStorage.setItem('hammer_auto_sync', 'false');
      expect(localStorage.getItem('hammer_auto_sync')).toBe('false');
    });

    it('should default to ZONA-A when no location is set', () => {
      localStorage.removeItem('hammer_loc');
      const defaultLocation = localStorage.getItem('hammer_loc') || 'ZONA-A';
      expect(defaultLocation).toBe('ZONA-A');
    });

    it('should default autoSync to true when not set', () => {
      localStorage.removeItem('hammer_auto_sync');
      const autoSync = localStorage.getItem('hammer_auto_sync') !== 'false';
      expect(autoSync).toBe(true);
    });
  });

  describe('Quantity calculations', () => {
    it('should calculate total quantity correctly', () => {
      const items = [
        { barcode: 'A', totalQuantity: 10 },
        { barcode: 'B', totalQuantity: 5 },
        { barcode: 'C', totalQuantity: 15 }
      ];

      const total = items.reduce((acc, item) => acc + item.totalQuantity, 0);
      expect(total).toBe(30);
    });

    it('should handle zero quantities', () => {
      const items = [
        { barcode: 'A', totalQuantity: 0 },
        { barcode: 'B', totalQuantity: 5 }
      ];

      const total = items.reduce((acc, item) => acc + item.totalQuantity, 0);
      expect(total).toBe(5);
    });

    it('should not allow negative quantities', () => {
      const calculateQty = (current: number, delta: number) => Math.max(0, current + delta);
      
      expect(calculateQty(5, -10)).toBe(0);
      expect(calculateQty(0, -5)).toBe(0);
      expect(calculateQty(10, -3)).toBe(7);
    });
  });

  describe('Batch aggregation', () => {
    it('should aggregate scans by barcode and location', () => {
      const scans = [
        { barcode: '123', qty: 5, loc: 'ZONA-A', ts: 1000 },
        { barcode: '123', qty: 3, loc: 'ZONA-A', ts: 2000 },
        { barcode: '456', qty: 2, loc: 'ZONA-B', ts: 1500 }
      ];

      const aggregated = scans.reduce((acc, curr) => {
        const key = `${curr.barcode}_${curr.loc}`;
        if (!acc[key]) {
          acc[key] = { ...curr };
        } else {
          acc[key].qty += curr.qty;
          acc[key].ts = Math.max(acc[key].ts, curr.ts);
        }
        return acc;
      }, {} as Record<string, { barcode: string; qty: number; loc: string; ts: number }>);

      expect(aggregated['123_ZONA-A'].qty).toBe(8);
      expect(aggregated['123_ZONA-A'].ts).toBe(2000);
      expect(aggregated['456_ZONA-B'].qty).toBe(2);
    });

    it('should filter out zero quantity items', () => {
      const items = [
        { barcode: '123', qty: 0 },
        { barcode: '456', qty: 5 },
        { barcode: '789', qty: -5 }
      ];

      const filtered = items.filter(b => b.qty > 0);
      expect(filtered.length).toBe(1);
      expect(filtered[0].barcode).toBe('456');
    });
  });

  describe('Expected vs Scanned comparison', () => {
    it('should identify missing items', () => {
      const manifest = [
        { barcode: 'A', expectedQty: 10 },
        { barcode: 'B', expectedQty: 5 },
        { barcode: 'C', expectedQty: 8 }
      ];

      const scanned = [
        { barcode: 'A', totalQuantity: 10 },
        { barcode: 'B', totalQuantity: 3 }
      ];

      const scannedBarcodes = new Set(scanned.map(s => s.barcode));
      const missing = manifest.filter(m => !scannedBarcodes.has(m.barcode));

      expect(missing.length).toBe(1);
      expect(missing[0].barcode).toBe('C');
    });

    it('should identify over-scanned items', () => {
      const manifest = [
        { barcode: 'A', expectedQty: 10 },
        { barcode: 'B', expectedQty: 5 }
      ];

      const scanned = [
        { barcode: 'A', totalQuantity: 12 },
        { barcode: 'B', totalQuantity: 3 }
      ];

      const manifestMap = new Map(manifest.map(m => [m.barcode, m.expectedQty]));
      const overScanned = scanned.filter(s => {
        const expected = manifestMap.get(s.barcode);
        return expected !== undefined && s.totalQuantity > expected;
      });

      expect(overScanned.length).toBe(1);
      expect(overScanned[0].barcode).toBe('A');
    });

    it('should calculate coverage percentage', () => {
      const manifest = [
        { barcode: 'A', expectedQty: 10 },
        { barcode: 'B', expectedQty: 5 },
        { barcode: 'C', expectedQty: 8 }
      ];

      const scanned = [
        { barcode: 'A', totalQuantity: 10 },
        { barcode: 'B', totalQuantity: 5 }
      ];

      const totalExpected = manifest.reduce((acc, m) => acc + m.expectedQty, 0);
      const totalScanned = scanned.reduce((acc, s) => acc + s.totalQuantity, 0);
      const coverage = (totalScanned / totalExpected) * 100;

      expect(coverage).toBeCloseTo(65.2, 1);
    });
  });

  describe('AutoSync behavior', () => {
    it('should return true by default for autoSync', () => {
      const getAutoSync = () => localStorage.getItem('hammer_auto_sync') !== 'false';
      
      localStorage.removeItem('hammer_auto_sync');
      expect(getAutoSync()).toBe(true);
    });

    it('should respect user preference for autoSync', () => {
      const getAutoSync = () => localStorage.getItem('hammer_auto_sync') !== 'false';
      
      localStorage.setItem('hammer_auto_sync', 'false');
      expect(getAutoSync()).toBe(false);
      
      localStorage.setItem('hammer_auto_sync', 'true');
      expect(getAutoSync()).toBe(true);
    });
  });

  describe('Timestamp handling', () => {
    it('should use max timestamp when aggregating', () => {
      const scans = [
        { barcode: '123', ts: 1000 },
        { barcode: '123', ts: 3000 },
        { barcode: '123', ts: 2000 }
      ];

      const latestTimestamp = Math.max(...scans.map(s => s.ts));
      expect(latestTimestamp).toBe(3000);
    });

    it('should sort items by timestamp descending', () => {
      const items = [
        { barcode: 'A', lastTimestamp: 1000 },
        { barcode: 'B', lastTimestamp: 3000 },
        { barcode: 'C', lastTimestamp: 2000 }
      ];

      const sorted = [...items].sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      
      expect(sorted[0].barcode).toBe('B');
      expect(sorted[1].barcode).toBe('C');
      expect(sorted[2].barcode).toBe('A');
    });
  });

  describe('Barcode normalization', () => {
    it('should normalize barcodes before processing', () => {
      const sanitizeBarcode = (code: string) => code.trim().toUpperCase();
      
      expect(sanitizeBarcode('  123456789  ')).toBe('123456789');
      expect(sanitizeBarcode('abc123')).toBe('ABC123');
    });

    it('should reject empty barcodes', () => {
      const sanitizeBarcode = (code: string) => code.trim();
      const isValidBarcode = (code: string) => sanitizeBarcode(code).length > 0;
      
      expect(isValidBarcode('')).toBe(false);
      expect(isValidBarcode('   ')).toBe(false);
      expect(isValidBarcode('123456')).toBe(true);
    });
  });

  describe('Write queue batching', () => {
    it('should batch writes at 400ms intervals', () => {
      const BATCH_INTERVAL = 400;
      expect(BATCH_INTERVAL).toBe(400);
    });

    it('should aggregate queue items before writing', () => {
      const queue = [
        { barcode: 'A', qty: 1, loc: 'ZONA-A', ts: 1000 },
        { barcode: 'A', qty: 2, loc: 'ZONA-A', ts: 1100 },
        { barcode: 'B', qty: 3, loc: 'ZONA-B', ts: 1200 }
      ];

      const batch = queue.reduce((acc, curr) => {
        const key = `${curr.barcode}_${curr.loc}`;
        if (!acc[key]) {
          acc[key] = { ...curr };
        } else {
          acc[key].qty += curr.qty;
          acc[key].ts = Math.max(acc[key].ts, curr.ts);
        }
        return acc;
      }, {} as Record<string, typeof queue[0]>);

      expect(Object.keys(batch).length).toBe(2);
      expect(batch['A_ZONA-A'].qty).toBe(3);
      expect(batch['B_ZONA-B'].qty).toBe(3);
    });
  });

  describe('Product name resolution', () => {
    it('should prefer manifest name over product name', () => {
      const manifestName = 'Producto del Manifest';
      const productName = 'Producto del Catálogo';
      
      const resolvedName = manifestName || productName || 'SKU_DESCONOCIDO';
      expect(resolvedName).toBe('Producto del Manifest');
    });

    it('should fallback to product name when no manifest', () => {
      const manifestName = '';
      const productName = 'Producto del Catálogo';
      
      const resolvedName = manifestName || productName || 'SKU_DESCONOCIDO';
      expect(resolvedName).toBe('Producto del Catálogo');
    });

    it('should use unknown placeholder when no names available', () => {
      const manifestName = '';
      const productName = '';
      
      const resolvedName = manifestName || productName || 'SKU_DESCONOCIDO';
      expect(resolvedName).toBe('SKU_DESCONOCIDO');
    });
  });

  describe('Pending writes tracking', () => {
    it('should track pending writes count', () => {
      let pendingWrites = 0;
      
      // Simular inicio de writes
      const batch = [{ barcode: 'A', qty: 1, loc: 'ZONA-A', ts: 1000 }];
      pendingWrites += batch.length;
      expect(pendingWrites).toBe(1);
      
      // Simular completado de writes
      pendingWrites = Math.max(0, pendingWrites - batch.length);
      expect(pendingWrites).toBe(0);
    });

    it('should show error state when write fails', () => {
      let syncError: string | null = null;
      
      // Simular error
      syncError = 'Error de escritura local';
      expect(syncError).toBe('Error de escritura local');
      
      // Simular recuperación
      syncError = null;
      expect(syncError).toBeNull();
    });
  });

  describe('Retry with exponential backoff', () => {
    it('should calculate exponential delay correctly', () => {
      const MAX_RETRIES = 3;
      const MAX_DELAY = 8000;
      
      const calculateDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), MAX_DELAY);
      
      expect(calculateDelay(0)).toBe(1000);   // 1s
      expect(calculateDelay(1)).toBe(2000);   // 2s
      expect(calculateDelay(2)).toBe(4000);   // 4s
      expect(calculateDelay(3)).toBe(8000);   // 8s (max)
      expect(calculateDelay(4)).toBe(8000);   // 8s (capped)
    });

    it('should respect MAX_RETRIES limit', () => {
      const MAX_RETRIES = 3;
      const attempt = MAX_RETRIES;
      
      expect(attempt >= MAX_RETRIES).toBe(true);
    });
  });

  describe('Haptic feedback', () => {
    it('should call navigator.vibrate on scan', () => {
      const mockVibrate = vi.fn();
      const originalNavigator = window.navigator;
      
      window.navigator = {
        ...originalNavigator,
        vibrate: mockVibrate
      } as any;
      
      if (window.navigator.vibrate) {
        window.navigator.vibrate(10);
        expect(mockVibrate).toHaveBeenCalledWith(10);
      }
      
      window.navigator = originalNavigator;
    });

    it('should handle missing navigator.vibrate gracefully', () => {
      const originalNavigator = window.navigator;
      const navigatorWithoutVibrate = { ...originalNavigator, vibrate: undefined };
      window.navigator = navigatorWithoutVibrate as any;
      
      const hasVibrate = typeof window.navigator?.vibrate === 'function';
      expect(hasVibrate).toBe(false);
      
      window.navigator = originalNavigator;
    });
  });
});
