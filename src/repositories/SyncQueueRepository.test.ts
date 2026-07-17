/**
 * SyncQueueRepository Tests
 */

import { describe, it, expect } from 'vitest';
import { syncQueueRepository, SyncQueueRepository } from './SyncQueueRepository';

describe('SyncQueueRepository', () => {
  describe('API surface', () => {
    it('should have all required methods', () => {
      expect(typeof syncQueueRepository.getRecent).toBe('function');
      expect(typeof syncQueueRepository.countByStatus).toBe('function');
      expect(typeof syncQueueRepository.clearOldLogs).toBe('function');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(syncQueueRepository).toBeDefined();
      expect(syncQueueRepository).toBeInstanceOf(SyncQueueRepository);
    });
  });

  describe('class instantiation', () => {
    it('should be instantiable', () => {
      const repo = new SyncQueueRepository();
      expect(repo).toBeDefined();
    });
  });
});

describe('SyncQueueRepository Types', () => {
  it('should support status values', () => {
    const validStatuses: Array<'success' | 'error'> = ['success', 'error'];

    validStatuses.forEach(status => {
      const log = { id: 1, status };
      expect(log.status).toBe(status);
    });
  });
});
