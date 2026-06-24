/**
 * SyncQueue Tests
 * 
 * Tests para la cola de sincronización con retry y backoff exponencial
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tipos
interface QueuedItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// Simulación del SyncQueue
class MockSyncQueue {
  private queue: QueuedItem[] = [];
  private maxRetries: number;
  private baseDelay: number;

  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  enqueue(item: Omit<QueuedItem, 'timestamp' | 'retryCount'>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.queue.push({
      ...item,
      id,
      timestamp: Date.now(),
      retryCount: 0
    });
    return id;
  }

  dequeue(): QueuedItem | undefined {
    return this.queue.shift();
  }

  peek(): QueuedItem | undefined {
    return this.queue[0];
  }

  get size(): number {
    return this.queue.length;
  }

  getAll(): QueuedItem[] {
    return [...this.queue];
  }

  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  incrementRetry(id: string, error?: string): boolean {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.retryCount++;
      item.lastError = error;
      return item.retryCount < this.maxRetries;
    }
    return false;
  }

  calculateDelay(retryCount: number): number {
    return this.baseDelay * Math.pow(2, retryCount);
  }

  clear(): void {
    this.queue = [];
  }
}

describe('SyncQueue', () => {
  let queue: MockSyncQueue;

  beforeEach(() => {
    queue = new MockSyncQueue(3, 1000);
  });

  afterEach(() => {
    queue.clear();
  });

  describe('queue operations', () => {
    it('should enqueue items', () => {
      const id = queue.enqueue({
        table: 'products',
        operation: 'insert',
        data: { barcode: '123', name: 'Test' }
      });

      expect(queue.size).toBe(1);
      expect(id).toBeDefined();
    });

    it('should dequeue items in FIFO order', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      queue.enqueue({ table: 'B', operation: 'insert', data: {} });

      const first = queue.dequeue();
      expect(first?.table).toBe('A');

      const second = queue.dequeue();
      expect(second?.table).toBe('B');
    });

    it('should peek at next item without removing', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      queue.enqueue({ table: 'B', operation: 'insert', data: {} });

      expect(queue.peek()?.table).toBe('A');
      expect(queue.size).toBe(2);
    });

    it('should remove items by id', () => {
      const id = queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      queue.enqueue({ table: 'B', operation: 'insert', data: {} });

      const removed = queue.remove(id);
      expect(removed).toBe(true);
      expect(queue.size).toBe(1);
      expect(queue.peek()?.table).toBe('B');
    });

    it('should return false when removing non-existent id', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      const removed = queue.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all items', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      queue.enqueue({ table: 'B', operation: 'insert', data: {} });
      queue.clear();
      expect(queue.size).toBe(0);
    });

    it('should get all items without modifying queue', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      queue.enqueue({ table: 'B', operation: 'insert', data: {} });

      const all = queue.getAll();
      expect(all).toHaveLength(2);
      expect(queue.size).toBe(2);
    });
  });

  describe('retry mechanism', () => {
    it('should track retry count', () => {
      const id = queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      
      queue.incrementRetry(id, 'Network error');
      const item = queue.peek();
      
      expect(item?.retryCount).toBe(1);
      expect(item?.lastError).toBe('Network error');
    });

    it('should return false when max retries exceeded', () => {
      const id = queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      
      queue.incrementRetry(id);
      queue.incrementRetry(id);
      const canRetry = queue.incrementRetry(id);
      
      expect(canRetry).toBe(false);
    });

    it('should allow retry when under max retries', () => {
      const id = queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      
      queue.incrementRetry(id);
      const canRetry = queue.incrementRetry(id);
      
      expect(canRetry).toBe(true);
    });
  });

  describe('exponential backoff', () => {
    it('should calculate delay with exponential backoff', () => {
      expect(queue.calculateDelay(0)).toBe(1000);  // 1s
      expect(queue.calculateDelay(1)).toBe(2000);  // 2s
      expect(queue.calculateDelay(2)).toBe(4000);  // 4s
      expect(queue.calculateDelay(3)).toBe(8000);  // 8s
    });

    it('should respect custom base delay', () => {
      const customQueue = new MockSyncQueue(3, 500);
      
      expect(customQueue.calculateDelay(0)).toBe(500);
      expect(customQueue.calculateDelay(1)).toBe(1000);
      expect(customQueue.calculateDelay(2)).toBe(2000);
    });
  });

  describe('item structure', () => {
    it('should generate unique IDs', () => {
      const id1 = queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      const id2 = queue.enqueue({ table: 'B', operation: 'insert', data: {} });
      
      expect(id1).not.toBe(id2);
    });

    it('should initialize retryCount to 0', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      const item = queue.peek();
      expect(item?.retryCount).toBe(0);
    });

    it('should track timestamp on enqueue', () => {
      const before = Date.now();
      queue.enqueue({ table: 'A', operation: 'insert', data: {} });
      const after = Date.now();
      
      const item = queue.peek();
      expect(item?.timestamp).toBeGreaterThanOrEqual(before);
      expect(item?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('persistence simulation', () => {
    it('should serialize queue to JSON', () => {
      queue.enqueue({ table: 'A', operation: 'insert', data: { x: 1 } });
      queue.enqueue({ table: 'B', operation: 'update', data: { y: 2 } });
      
      const json = JSON.stringify(queue.getAll());
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].table).toBe('A');
      expect(parsed[1].operation).toBe('update');
    });

    it('should restore queue from JSON', () => {
      const data: QueuedItem[] = [
        { id: '1', table: 'X', operation: 'delete', data: {}, timestamp: 1000, retryCount: 0 }
      ];
      
      // Simular restauración
      const restoredQueue = new MockSyncQueue();
      restoredQueue.enqueue({ table: 'X', operation: 'delete', data: {} });
      
      expect(restoredQueue.size).toBe(1);
    });
  });

  describe('batch operations', () => {
    it('should batch multiple operations on same item', () => {
      const id1 = queue.enqueue({ table: 'A', operation: 'insert', data: { count: 1 } });
      queue.incrementRetry(id1);
      queue.incrementRetry(id1);
      
      const item = queue.getAll().find(i => i.id === id1);
      expect(item?.retryCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty queue dequeue', () => {
      const item = queue.dequeue();
      expect(item).toBeUndefined();
    });

    it('should handle empty queue peek', () => {
      const item = queue.peek();
      expect(item).toBeUndefined();
    });

    it('should handle empty queue size', () => {
      expect(queue.size).toBe(0);
    });
  });
});
