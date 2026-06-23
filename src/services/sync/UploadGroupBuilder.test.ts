/**
 * UploadGroupBuilder Tests
 *
 * Tests para las funciones de construcción de grupos de upload.
 */

import { describe, it, expect } from 'vitest';
import { UploadGroup } from './UploadGroupBuilder';
import { filterGroupsByType, sortGroupsByPriority, getUploadBatchSize } from './UploadGroupBuilder';

describe('UploadGroupBuilder', () => {
  describe('getUploadBatchSize', () => {
    it('should return a positive number', () => {
      const batchSize = getUploadBatchSize();
      expect(batchSize).toBeGreaterThan(0);
    });

    it('should return 500 as default batch size', () => {
      expect(getUploadBatchSize()).toBe(500);
    });
  });

  describe('filterGroupsByType', () => {
    const mockGroups: UploadGroup[] = [
      {
        erpOrder: 'ORD001',
        sessionCount: 2,
        totalUnits: 100,
        sessionIds: ['s1', 's2'],
        logisticsLabels: ['LBL001'],
        type: 'reception',
      },
      {
        erpOrder: 'ORD002',
        sessionCount: 1,
        totalUnits: 50,
        sessionIds: ['s3'],
        logisticsLabels: [],
        type: 'inventory',
      },
      {
        erpOrder: 'ORD003',
        sessionCount: 3,
        totalUnits: 200,
        sessionIds: ['s4', 's5', 's6'],
        logisticsLabels: ['LBL002'],
        type: 'products',
      },
      {
        erpOrder: 'ORPHANS',
        sessionCount: 1,
        totalUnits: 10,
        sessionIds: ['s7'],
        logisticsLabels: [],
        type: 'orphans',
      },
    ];

    it('should filter by reception type', () => {
      const filtered = filterGroupsByType(mockGroups, 'reception');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('reception');
    });

    it('should filter by inventory type', () => {
      const filtered = filterGroupsByType(mockGroups, 'inventory');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('inventory');
    });

    it('should filter by products type', () => {
      const filtered = filterGroupsByType(mockGroups, 'products');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('products');
    });

    it('should filter by orphans type', () => {
      const filtered = filterGroupsByType(mockGroups, 'orphans');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('orphans');
    });

    it('should return empty array when no matches', () => {
      const emptyGroups: UploadGroup[] = [];
      const filtered = filterGroupsByType(emptyGroups, 'reception');
      expect(filtered).toHaveLength(0);
    });

    it('should not mutate original array', () => {
      const originalLength = mockGroups.length;
      filterGroupsByType(mockGroups, 'reception');
      expect(mockGroups).toHaveLength(originalLength);
    });
  });

  describe('sortGroupsByPriority', () => {
    const mockGroups: UploadGroup[] = [
      {
        erpOrder: 'ORD005',
        sessionCount: 1,
        totalUnits: 50,
        sessionIds: ['s5'],
        logisticsLabels: [],
        type: 'orphans',
      },
      {
        erpOrder: 'ORD001',
        sessionCount: 2,
        totalUnits: 100,
        sessionIds: ['s1', 's2'],
        logisticsLabels: ['LBL001'],
        type: 'reception',
      },
      {
        erpOrder: 'ORD003',
        sessionCount: 3,
        totalUnits: 200,
        sessionIds: ['s3', 's4', 's5'],
        logisticsLabels: ['LBL002'],
        type: 'inventory',
      },
      {
        erpOrder: 'ORD002',
        sessionCount: 1,
        totalUnits: 150,
        sessionIds: ['s6'],
        logisticsLabels: [],
        type: 'reception',
      },
    ];

    it('should sort by priority order', () => {
      const sorted = sortGroupsByPriority(mockGroups);
      
      expect(sorted[0].type).toBe('reception');
      expect(sorted[1].type).toBe('reception');
      expect(sorted[2].type).toBe('inventory');
      expect(sorted[3].type).toBe('orphans');
    });

    it('should sort reception with higher units first', () => {
      const sorted = sortGroupsByPriority(mockGroups);
      
      const receptionGroups = sorted.filter(g => g.type === 'reception');
      expect(receptionGroups[0].totalUnits).toBeGreaterThan(receptionGroups[1].totalUnits);
    });

    it('should not mutate original array', () => {
      const originalOrder = mockGroups.map(g => g.erpOrder);
      sortGroupsByPriority(mockGroups);
      
      // Original should remain in original order
      expect(mockGroups.map(g => g.erpOrder)).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const sorted = sortGroupsByPriority([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single item array', () => {
      const singleGroup: UploadGroup[] = [{
        erpOrder: 'ORD001',
        sessionCount: 1,
        totalUnits: 100,
        sessionIds: ['s1'],
        logisticsLabels: [],
        type: 'reception',
      }];
      
      const sorted = sortGroupsByPriority(singleGroup);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].erpOrder).toBe('ORD001');
    });

    it('should sort all types in correct priority order', () => {
      const allTypes: UploadGroup[] = [
        { erpOrder: '1', sessionCount: 1, totalUnits: 1, sessionIds: [], logisticsLabels: [], type: 'orphans' },
        { erpOrder: '2', sessionCount: 1, totalUnits: 1, sessionIds: [], logisticsLabels: [], type: 'dynamic' },
        { erpOrder: '3', sessionCount: 1, totalUnits: 1, sessionIds: [], logisticsLabels: [], type: 'products' },
        { erpOrder: '4', sessionCount: 1, totalUnits: 1, sessionIds: [], logisticsLabels: [], type: 'inventory' },
        { erpOrder: '5', sessionCount: 1, totalUnits: 1, sessionIds: [], logisticsLabels: [], type: 'reception' },
      ];

      const sorted = sortGroupsByPriority(allTypes);
      
      expect(sorted[0].type).toBe('reception');
      expect(sorted[1].type).toBe('inventory');
      expect(sorted[2].type).toBe('dynamic');
      expect(sorted[3].type).toBe('products');
      expect(sorted[4].type).toBe('orphans');
    });
  });
});
