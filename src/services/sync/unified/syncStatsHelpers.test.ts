/**
 * Tests para syncStatsHelpers
 */

import { describe, it, expect } from 'vitest';
import { canFSMTransition, getRealtimeStats } from './syncStatsHelpers';

// Mock db
vi.mock('@/db', () => ({
  db: {
    syncQueue: {
      count: vi.fn().mockResolvedValue(5),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('syncStatsHelpers', () => {
  describe('canFSMTransition', () => {
    it('should allow SYNC_ALL from idle state', () => {
      expect(canFSMTransition('idle', 'SYNC_ALL')).toBe(true);
    });

    it('should allow SYNC_ALL from error state', () => {
      expect(canFSMTransition('error', 'SYNC_ALL')).toBe(true);
    });

    it('should allow SYNC_ALL from offline state', () => {
      expect(canFSMTransition('offline', 'SYNC_ALL')).toBe(true);
    });

    it('should not allow SYNC_ALL from syncing state', () => {
      expect(canFSMTransition('syncing_catalogs', 'SYNC_ALL')).toBe(false);
      expect(canFSMTransition('syncing_batches', 'SYNC_ALL')).toBe(false);
    });

    it('should allow ERROR from syncing states', () => {
      expect(canFSMTransition('syncing_catalogs', 'ERROR')).toBe(true);
      expect(canFSMTransition('syncing_batches', 'ERROR')).toBe(true);
    });

    it('should allow RESET from error state', () => {
      expect(canFSMTransition('error', 'RESET')).toBe(true);
    });

    it('should return false for unknown events', () => {
      expect(canFSMTransition('idle', 'UNKNOWN_EVENT')).toBe(false);
    });
  });

  describe('getRealtimeStats', () => {
    it('should return correct stats', () => {
      const mockRealtimeState = {
        isConnected: true,
        lastHeartbeat: 1700000000000,
        reconnectAttempts: 0,
        pendingChanges: new Map([['products', [{ eventType: 'INSERT' }]]]),
        debounceTimers: new Map(),
      };

      const stats = getRealtimeStats(mockRealtimeState as any);

      expect(stats.isConnected).toBe(true);
      expect(stats.lastHeartbeat).toBe(1700000000000);
      expect(stats.pendingChanges).toBe(1);
    });

    it('should return 0 pending changes when empty', () => {
      const mockRealtimeState = {
        isConnected: false,
        lastHeartbeat: 0,
        reconnectAttempts: 0,
        pendingChanges: new Map(),
        debounceTimers: new Map(),
      };

      const stats = getRealtimeStats(mockRealtimeState as any);

      expect(stats.pendingChanges).toBe(0);
      expect(stats.isConnected).toBe(false);
    });
  });
});
