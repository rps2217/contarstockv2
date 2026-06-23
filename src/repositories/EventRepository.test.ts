/**
 * EventRepository Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventRepository, EventRecord } from './EventRepository';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    dynamic_data: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      reverse: vi.fn().mockReturnThis(),
      sortBy: vi.fn().mockResolvedValue([]),
    }
  }
}));

vi.mock('../services/dynamicDataService', () => ({
  dynamicDataService: {
    saveRecord: vi.fn().mockResolvedValue(undefined),
    deleteRecord: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('EventRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return empty array when no records exist', async () => {
      const records = await eventRepository.getAll();
      expect(records).toEqual([]);
    });

    it('should map dynamic records to EventRecord format', async () => {
      const mockRecord = {
        id: 'event-1',
        tableName: 'EVENTOS',
        data: {
          barcode: '1234567890',
          productName: 'Test Product',
          event: 'IN',
          quantity: 10,
        },
        timestamp: Date.now(),
        syncStatus: 'synced' as const,
      };

      const { db } = await import('@/db');
      (db.dynamic_data.toArray as any).mockResolvedValueOnce([mockRecord]);

      const records = await eventRepository.getAll();
      
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('event-1');
      expect(records[0].barcode).toBe('1234567890');
      expect(records[0].productName).toBe('Test Product');
      expect(records[0].syncStatus).toBe('synced');
    });

    it('should preserve all event fields', async () => {
      const mockRecord = {
        id: 'event-2',
        tableName: 'EVENTOS',
        data: {
          barcode: '9876543210',
          productName: 'Another Product',
          providerName: 'Test Provider',
          event: 'OUT',
          quantity: 50,
          location: 'BOD-01',
          frc: 'FRC-123',
          nguia: 'GUIA-456',
          category: 'ELECTRONICS',
          isAdjusted: true,
          destino: 'DEST-01',
          traspaso: 'TRA-01',
          observaciones: 'Test note',
        },
        timestamp: Date.now(),
        syncStatus: 'pending' as const,
      };

      const { db } = await import('@/db');
      (db.dynamic_data.toArray as any).mockResolvedValueOnce([mockRecord]);

      const records = await eventRepository.getAll();
      
      expect(records[0]).toMatchObject({
        barcode: '9876543210',
        productName: 'Another Product',
        providerName: 'Test Provider',
        event: 'OUT',
        quantity: 50,
        location: 'BOD-01',
        frc: 'FRC-123',
        nguia: 'GUIA-456',
        category: 'ELECTRONICS',
        isAdjusted: true,
        destino: 'DEST-01',
        traspaso: 'TRA-01',
        observaciones: 'Test note',
        syncStatus: 'pending',
      });
    });
  });

  describe('put', () => {
    it('should not overwrite pending local changes', async () => {
      const { db } = await import('@/db');
      
      // Existing record with pending status
      (db.dynamic_data.get as any).mockResolvedValueOnce({
        id: 'event-1',
        syncStatus: 'pending',
        data: { localChange: true }
      });

      await eventRepository.put({ id: 'event-1', barcode: 'new-barcode' });

      // Should not call put when existing record is pending
      expect(db.dynamic_data.put).not.toHaveBeenCalled();
    });

    it('should save synced record when no conflict exists', async () => {
      const { db } = await import('@/db');
      (db.dynamic_data.get as any).mockResolvedValueOnce(null);

      await eventRepository.put({ id: 'event-new', barcode: '1234567890' });

      expect(db.dynamic_data.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-new',
          tableName: 'EVENTOS',
          syncStatus: 'synced'
        })
      );
    });

    it('should use provided tableName when specified', async () => {
      const { db } = await import('@/db');
      (db.dynamic_data.get as any).mockResolvedValueOnce(null);

      await eventRepository.put({ id: 'event-1' }, 'CUSTOM_TABLE');

      expect(db.dynamic_data.put).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: 'CUSTOM_TABLE'
        })
      );
    });
  });

  describe('save', () => {
    it('should call dynamicDataService.saveRecord', async () => {
      const { dynamicDataService } = await import('../services/dynamicDataService');
      
      const event: Partial<EventRecord> & { id: string } = {
        id: 'event-1',
        barcode: '1234567890',
        productName: 'Test'
      };

      await eventRepository.save(event);

      expect(dynamicDataService.saveRecord).toHaveBeenCalledWith(
        'EVENTOS',
        event,
        'event-1'
      );
    });
  });

  describe('delete', () => {
    it('should call dynamicDataService.deleteRecord', async () => {
      const { dynamicDataService } = await import('../services/dynamicDataService');

      await eventRepository.delete('event-1');

      expect(dynamicDataService.deleteRecord).toHaveBeenCalledWith('event-1');
    });
  });

  describe('bulkSave', () => {
    it('should bulk put all records', async () => {
      const { db } = await import('@/db');
      
      const events: EventRecord[] = [
        {
          id: 'event-1',
          barcode: '123',
          productName: 'Product 1',
          providerName: 'Provider',
          event: 'IN',
          quantity: 10,
          location: 'LOC-1',
          frc: 'FRC-1',
          nguia: 'GUIA-1',
          timestamp: Date.now(),
          isAdjusted: false,
          syncStatus: 'synced'
        },
        {
          id: 'event-2',
          barcode: '456',
          productName: 'Product 2',
          providerName: 'Provider',
          event: 'OUT',
          quantity: 5,
          location: 'LOC-2',
          frc: 'FRC-2',
          nguia: 'GUIA-2',
          timestamp: Date.now(),
          isAdjusted: false,
          syncStatus: 'pending'
        }
      ];

      await eventRepository.bulkSave(events);

      expect(db.dynamic_data.bulkPut).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'event-1', tableName: 'EVENTOS' }),
          expect.objectContaining({ id: 'event-2', tableName: 'EVENTOS' })
        ])
      );
    });
  });
});
