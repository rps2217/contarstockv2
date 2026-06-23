/**
 * Tests para SyncMetrics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncMetricsService } from './SyncMetrics';
import type { SyncMetric, SyncStats, SyncHealth } from './SyncMetrics';

describe('SyncMetrics', () => {
  let service: SyncMetricsService;

  beforeEach(() => {
    service = new SyncMetricsService();
  });

  describe('recordPush', () => {
    it('should record a push operation', () => {
      service.recordPush('products', true, 150, 10);
      
      const stats = service.getStats();
      expect(stats.totalSyncs).toBe(1);
      expect(stats.successfulSyncs).toBe(1);
      expect(stats.totalRecordsPushed).toBe(10);
    });

    it('should track failed push operations', () => {
      service.recordPush('products', false, 100, 5, 'Network error');
      
      const stats = service.getStats();
      expect(stats.totalSyncs).toBe(1);
      expect(stats.failedSyncs).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return default stats when no metrics recorded', () => {
      const stats = service.getStats();
      
      expect(stats.totalSyncs).toBe(0);
      expect(stats.successfulSyncs).toBe(0);
      expect(stats.failedSyncs).toBe(0);
    });

    it('should aggregate stats from multiple operations', () => {
      service.recordPush('products', true, 500, 100);
      service.recordPush('customers', true, 300, 50);
      service.recordPush('providers', false, 200, 25, 'Error');
      
      const stats = service.getStats();
      expect(stats.totalSyncs).toBe(3);
      expect(stats.successfulSyncs).toBe(2);
      expect(stats.failedSyncs).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return stats with tables object', () => {
      service.recordPush('products', true, 100, 10);
      
      const stats = service.getStats();
      expect(stats.tables).toBeDefined();
      expect(stats.tables.products).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return recent metrics', () => {
      service.recordPush('products', true, 100, 10);
      service.recordPush('customers', true, 50, 5);
      
      const history = service.getHistory(10);
      expect(history.length).toBe(2);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        service.recordPush('products', true, 100, 10);
      }
      
      const history = service.getHistory(3);
      expect(history.length).toBe(3);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of new metrics', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);
      
      service.recordPush('products', true, 100, 10);
      
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      service.recordPush('customers', true, 50, 5);
      
      // Should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('SyncMetricsService', () => {
    it('should be instantiable', () => {
      expect(service).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof service.recordPush).toBe('function');
      expect(typeof service.recordPull).toBe('function');
      expect(typeof service.recordSync).toBe('function');
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.getHealth).toBe('function');
      expect(typeof service.getHistory).toBe('function');
      expect(typeof service.subscribe).toBe('function');
    });
  });

  describe('Type definitions', () => {
    it('should accept valid SyncMetric', () => {
      const metric: SyncMetric = {
        timestamp: Date.now(),
        table: 'products',
        operation: 'push',
        success: true,
        duration: 100,
        recordsAffected: 10
      };
      expect(metric.table).toBe('products');
    });

    it('should accept SyncStats structure', () => {
      const stats: SyncStats = {
        totalSyncs: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        totalRecordsPushed: 80,
        totalRecordsPulled: 20,
        averageLatency: 150,
        lastSyncTime: Date.now(),
        tables: {}
      };
      expect(stats.totalSyncs).toBe(10);
    });

    it('should accept SyncHealth structure', () => {
      const health: SyncHealth = {
        isHealthy: true,
        score: 95,
        issues: [],
        lastCheck: Date.now()
      };
      expect(health.isHealthy).toBe(true);
      expect(health.score).toBe(95);
    });

    it('should support push and pull operations', () => {
      const pushMetric: SyncMetric = {
        timestamp: Date.now(),
        table: 'products',
        operation: 'push',
        success: true,
        duration: 100,
        recordsAffected: 10
      };
      expect(pushMetric.operation).toBe('push');

      const pullMetric: SyncMetric = {
        timestamp: Date.now(),
        table: 'products',
        operation: 'pull',
        success: true,
        duration: 100,
        recordsAffected: 5
      };
      expect(pullMetric.operation).toBe('pull');

      const syncMetric: SyncMetric = {
        timestamp: Date.now(),
        table: 'products',
        operation: 'sync',
        success: true,
        duration: 100,
        recordsAffected: 15
      };
      expect(syncMetric.operation).toBe('sync');
    });
  });
});
