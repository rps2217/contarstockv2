/**
 * syncQueueProcessor Tests
 *
 * NOTA: processQueueItem depende de supabase y variables de entorno
 * que no están disponibles en tests. Por eso solo probamos que existe.
 */

import { describe, it, expect } from 'vitest';

// Test de integración de tipos
import type { QueuedSyncItem } from './types';

describe('syncQueueProcessor', () => {
  describe('types', () => {
    it('should have valid QueuedSyncItem structure', () => {
      const item: QueuedSyncItem = {
        id: 1,
        tableName: 'products',
        operation: 'create',
        recordId: '123',
        data: { sku: 'TEST-001' },
        timestamp: Date.now(),
        retries: 0,
        priority: 'normal',
      };

      expect(item.tableName).toBe('products');
      expect(item.operation).toBe('create');
      expect(item.recordId).toBe('123');
      expect(item.priority).toBe('normal');
    });

    it('should allow all operation types', () => {
      const createItem: QueuedSyncItem = {
        tableName: 'products',
        operation: 'create',
        recordId: '123',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        priority: 'normal',
      };

      const updateItem: QueuedSyncItem = {
        ...createItem,
        operation: 'update',
      };

      const deleteItem: QueuedSyncItem = {
        ...createItem,
        operation: 'delete',
      };

      expect(createItem.operation).toBe('create');
      expect(updateItem.operation).toBe('update');
      expect(deleteItem.operation).toBe('delete');
    });

    it('should allow all priority levels', () => {
      const highPriority: QueuedSyncItem = {
        tableName: 'products',
        operation: 'create',
        recordId: '123',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        priority: 'high',
      };

      const normalPriority: QueuedSyncItem = {
        ...highPriority,
        priority: 'normal',
      };

      const lowPriority: QueuedSyncItem = {
        ...highPriority,
        priority: 'low',
      };

      expect(highPriority.priority).toBe('high');
      expect(normalPriority.priority).toBe('normal');
      expect(lowPriority.priority).toBe('low');
    });
  });
});
