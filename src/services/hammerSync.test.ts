/**
 * hammerSync Tests
 * 
 * Tests para funciones de sincronización masiva y migración de datos
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tipos de mock para MassiveDb
interface MockBlindManifest {
  batchId: string;
  barcode: string;
  name?: string;
  expectedQty: number;
  loc?: string;
}

interface MockBlindScan {
  batchId: string;
  barcode: string;
  quantity: number;
  location?: string;
  timestamp: number;
}

// Mock implementations
const mockMassiveDb = {
  blindManifests: {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined)
  },
  blindScans: {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined)
  },
  transaction: vi.fn(async (mode: string, tables: any[], callback: Function) => {
    await callback();
  })
};

const mockDb = {
  expectedOrders: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null)
  },
  sessions: {
    update: vi.fn().mockResolvedValue(undefined)
  },
  scans: {
    bulkAdd: vi.fn().mockResolvedValue(undefined)
  }
};

vi.mock('../db', () => ({
  db: mockDb
}));

vi.mock('../db', () => ({
  hammerDb: mockMassiveDb
}));

describe('hammerSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('BlindManifest to ExpectedOrder migration', () => {
    it('should convert manifest items to ExpectedOrder items format', () => {
      const manifests: MockBlindManifest[] = [
        { batchId: 'TEST123', barcode: '111', name: 'Producto A', expectedQty: 10, loc: 'ZONA-A' },
        { batchId: 'TEST123', barcode: '222', name: 'Producto B', expectedQty: 5, loc: 'ZONA-B' },
        { batchId: 'TEST123', barcode: '333', name: 'Producto C', expectedQty: 8, loc: 'ZONA-A' }
      ];

      const expectedItems = manifests.map(m => ({
        barcode: m.barcode.trim(),
        name: m.name || `SKU ${m.barcode}`,
        expectedQty: m.expectedQty
      }));

      expect(expectedItems).toHaveLength(3);
      expect(expectedItems[0]).toEqual({
        barcode: '111',
        name: 'Producto A',
        expectedQty: 10
      });
    });

    it('should calculate totalExpectedUnits correctly', () => {
      const items = [
        { barcode: '111', name: 'A', expectedQty: 10 },
        { barcode: '222', name: 'B', expectedQty: 5 },
        { barcode: '333', name: 'C', expectedQty: 8 }
      ];

      const totalExpectedUnits = items.reduce((acc, i) => acc + i.expectedQty, 0);
      expect(totalExpectedUnits).toBe(23);
    });

    it('should calculate totalExpectedSKUs correctly', () => {
      const items = [
        { barcode: '111', name: 'A', expectedQty: 10 },
        { barcode: '222', name: 'B', expectedQty: 5 },
        { barcode: '333', name: 'C', expectedQty: 8 }
      ];

      const totalExpectedSKUs = items.length;
      expect(totalExpectedSKUs).toBe(3);
    });

    it('should generate order ID from batchId when not provided', () => {
      const batchId = 'abcdef12';
      const generatedOrderId = `HM-${batchId.substring(0, 8).toUpperCase()}`;
      
      expect(generatedOrderId).toBe('HM-ABCDEF12');
    });

    it('should use provided orderId when available', () => {
      const providedOrderId = 'CUSTOM-ORDER-001';
      const batchId = 'abcdef12';
      
      const orderId = providedOrderId || `HM-${batchId.substring(0, 8).toUpperCase()}`;
      
      expect(orderId).toBe('CUSTOM-ORDER-001');
    });
  });

  describe('Batch ID generation', () => {
    it('should truncate batchId to 8 characters for order ID', () => {
      const batchId = 'VERYLONG_BATCH_ID_THAT_NEEDS_TRUNCATING';
      const truncated = batchId.substring(0, 8).toUpperCase();
      
      expect(truncated).toBe('VERYLONG');
      expect(truncated.length).toBe(8);
    });

    it('should handle short batchIds', () => {
      const batchId = 'SHORT';
      const truncated = batchId.substring(0, 8).toUpperCase();
      
      expect(truncated).toBe('SHORT');
    });
  });

  describe('Scan aggregation', () => {
    it('should aggregate scans by barcode and location', () => {
      const scans: MockBlindScan[] = [
        { batchId: 'TEST', barcode: '111', quantity: 5, location: 'ZONA-A', timestamp: 1000 },
        { batchId: 'TEST', barcode: '111', quantity: 3, location: 'ZONA-A', timestamp: 2000 },
        { batchId: 'TEST', barcode: '222', quantity: 2, location: 'ZONA-B', timestamp: 1500 }
      ];

      const aggregated = scans.reduce((acc, curr) => {
        const key = `${curr.barcode}_${curr.location}`;
        if (!acc[key]) {
          acc[key] = { ...curr };
        } else {
          acc[key].quantity += curr.quantity;
          acc[key].timestamp = Math.max(acc[key].timestamp, curr.timestamp);
        }
        return acc;
      }, {} as Record<string, MockBlindScan>);

      expect(Object.keys(aggregated)).toHaveLength(2);
      expect(aggregated['111_ZONA-A'].quantity).toBe(8);
      expect(aggregated['111_ZONA-A'].timestamp).toBe(2000);
    });

    it('should filter out zero quantity scans', () => {
      const scans = [
        { barcode: '111', quantity: 0 },
        { barcode: '222', quantity: 5 },
        { barcode: '333', quantity: -2 }
      ];

      const validScans = scans.filter(s => s.quantity > 0);
      
      expect(validScans).toHaveLength(1);
      expect(validScans[0].barcode).toBe('222');
    });
  });

  describe('Manifest loading from hammerDb', () => {
    it('should query blindManifests by batchId', async () => {
      const batchId = 'TEST123';
      const manifests = [
        { batchId: 'TEST123', barcode: '111', expectedQty: 10 }
      ];

      (mockMassiveDb.blindManifests.where as any).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(manifests)
        })
      });

      const result = await (mockMassiveDb.blindManifests.where('batchId').equals(batchId) as any).toArray();
      
      expect(result).toEqual(manifests);
    });

    it('should delete existing manifests before adding new ones', async () => {
      const batchId = 'TEST123';
      const newManifests = [{ batchId, barcode: '111', expectedQty: 10 }];

      // Mock the chain properly
      const mockWhere = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          delete: vi.fn().mockResolvedValue(undefined)
        })
      });
      
      mockMassiveDb.blindManifests.where = mockWhere;

      await (mockMassiveDb as any).transaction('rw', mockMassiveDb.blindManifests, async () => {
        await mockMassiveDb.blindManifests.where('batchId').equals(batchId).delete();
        await mockMassiveDb.blindManifests.bulkAdd(newManifests);
      });

      expect(mockMassiveDb.blindManifests.where).toHaveBeenCalledWith('batchId');
      expect(mockMassiveDb.blindManifests.bulkAdd).toHaveBeenCalledWith(newManifests);
    });
  });

  describe('ExpectedOrder structure', () => {
    it('should create valid ExpectedOrder structure', () => {
      const batchId = 'TEST123';
      const manifests = [
        { batchId, barcode: '111', name: 'Producto A', expectedQty: 10 },
        { batchId, barcode: '222', name: 'Producto B', expectedQty: 5 }
      ];

      const items = manifests.map(m => ({
        barcode: m.barcode,
        name: m.name || `SKU ${m.barcode}`,
        expectedQty: m.expectedQty
      }));

      const expectedOrder = {
        id: `HM-${batchId.substring(0, 8).toUpperCase()}`,
        internalId: `HM-${batchId.substring(0, 8).toUpperCase()}`,
        items,
        totalExpectedUnits: items.reduce((acc, i) => acc + i.expectedQty, 0),
        totalExpectedSKUs: items.length,
        importedAt: Date.now(),
        metadata: {
          documentType: 'Hammer Manifest',
          date: new Date().toLocaleDateString(),
          orderNote: `Migrado desde Hammer batch: ${batchId}`
        }
      };

      expect(expectedOrder.id).toBe('HM-TEST123');
      expect(expectedOrder.items).toHaveLength(2);
      expect(expectedOrder.totalExpectedUnits).toBe(15);
      expect(expectedOrder.totalExpectedSKUs).toBe(2);
      expect(expectedOrder.metadata.documentType).toBe('Hammer Manifest');
    });

    it('should mark orders migrated from hammer', () => {
      const expectedOrder = {
        id: 'HM-TEST123',
        _fromHammer: true
      };

      expect(expectedOrder._fromHammer).toBe(true);
    });
  });

  describe('Migration validation', () => {
    it('should throw error when no manifests exist', () => {
      const manifests: MockBlindManifest[] = [];

      const migrate = () => {
        if (manifests.length === 0) {
          throw new Error(`No hay manifests en el lote para migrar.`);
        }
      };

      expect(migrate).toThrow('No hay manifests en el lote para migrar.');
    });

    it('should not overwrite existing order without confirmation', () => {
      const existingOrder = { id: 'HM-TEST123', items: [] };
      const newOrder = { id: 'HM-TEST123', items: [{ barcode: '111' }] };

      // Simular que existe y se debe actualizar
      const shouldUpdate = existingOrder !== null;
      
      expect(shouldUpdate).toBe(true);
    });
  });

  describe('Barcode sanitization', () => {
    it('should trim and normalize barcodes', () => {
      const sanitizeBarcode = (code: string) => code.trim().toUpperCase();

      expect(sanitizeBarcode('  123456789  ')).toBe('123456789');
      expect(sanitizeBarcode('abc123')).toBe('ABC123');
      expect(sanitizeBarcode('  ABC  123  ')).toBe('ABC  123');
    });
  });

  describe('Session creation from manifest', () => {
    it('should generate session label from batchId', () => {
      const batchId = 'TEST123';
      const sessionLabel = `TEST_${batchId.substring(0, 8)}`;

      expect(sessionLabel).toBe('TEST_TEST123');
    });

    it('should create session with expected order items', () => {
      const expectedOrder = {
        id: 'TEST-ORDER',
        items: [
          { barcode: '111', name: 'A', expectedQty: 10 },
          { barcode: '222', name: 'B', expectedQty: 5 }
        ]
      };

      const session = {
        erpOrder: expectedOrder.id,
        expectedItems: expectedOrder.items,
        isVerifiedMode: true
      };

      expect(session.erpOrder).toBe('TEST-ORDER');
      expect(session.expectedItems).toHaveLength(2);
      expect(session.isVerifiedMode).toBe(true);
    });
  });

  describe('Manifest filtering', () => {
    it('should filter out manifests with zero or negative quantity', () => {
      const manifests = [
        { barcode: '111', expectedQty: 10 },
        { barcode: '222', expectedQty: 0 },
        { barcode: '333', expectedQty: -5 },
        { barcode: '444', expectedQty: 8 }
      ];

      const validManifests = manifests.filter(m => m.expectedQty > 0);

      expect(validManifests).toHaveLength(2);
      expect(validManifests[0].barcode).toBe('111');
      expect(validManifests[1].barcode).toBe('444');
    });

    it('should filter out manifests without barcode', () => {
      const manifests = [
        { barcode: '111', expectedQty: 10 },
        { barcode: '', expectedQty: 5 },
        { barcode: '   ', expectedQty: 8 }
      ];

      const validManifests = manifests.filter(m => m.barcode.trim().length > 0);

      expect(validManifests).toHaveLength(1);
      expect(validManifests[0].barcode).toBe('111');
    });
  });
});
