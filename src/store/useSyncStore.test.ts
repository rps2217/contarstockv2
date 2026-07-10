/**
 * useSyncStore Tests
 *
 * Tests para el store de sincronización.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncStore } from './useSyncStore';

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,
      pendingItems: 0,
      lastSyncPerTable: {},
      latencyMs: null,
      isSupabaseConnected: true,
      conflicts: 0,
      incidents: [],
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useSyncStore.getState();

      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncTime).toBeNull();
      expect(state.syncError).toBeNull();
      expect(state.pendingItems).toBe(0);
      expect(state.lastSyncPerTable).toEqual({});
      expect(state.conflicts).toBe(0);
      expect(state.incidents).toEqual([]);
    });
  });

  describe('sync status', () => {
    it('should set isSyncing to true', () => {
      const { setSyncing } = useSyncStore.getState();

      setSyncing(true);
      expect(useSyncStore.getState().isSyncing).toBe(true);
    });

    it('should set isSyncing to false', () => {
      const { setSyncing } = useSyncStore.getState();

      setSyncing(true);
      setSyncing(false);
      expect(useSyncStore.getState().isSyncing).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set sync error', () => {
      const { setSyncError } = useSyncStore.getState();

      setSyncError('Network error');
      expect(useSyncStore.getState().syncError).toBe('Network error');
    });

    it('should clear sync error with null', () => {
      const { setSyncError } = useSyncStore.getState();

      setSyncError('Some error');
      setSyncError(null);
      expect(useSyncStore.getState().syncError).toBeNull();
    });
  });

  describe('pending items', () => {
    it('should set pending items count', () => {
      const { setPendingItems } = useSyncStore.getState();

      setPendingItems(5);
      expect(useSyncStore.getState().pendingItems).toBe(5);
    });

    it('should set pending items to zero', () => {
      const { setPendingItems } = useSyncStore.getState();

      setPendingItems(10);
      setPendingItems(0);
      expect(useSyncStore.getState().pendingItems).toBe(0);
    });
  });

  describe('last sync time', () => {
    it('should set last sync time', () => {
      const { setLastSyncTime } = useSyncStore.getState();
      const now = Date.now();

      setLastSyncTime(now);
      expect(useSyncStore.getState().lastSyncTime).toBe(now);
    });

    it('should track sync time per table', () => {
      const { setTableSyncTime } = useSyncStore.getState();
      const now = Date.now();

      setTableSyncTime('products', now);
      expect(useSyncStore.getState().lastSyncPerTable.products).toBe(now);

      setTableSyncTime('providers', now + 1000);
      expect(useSyncStore.getState().lastSyncPerTable.providers).toBe(now + 1000);
    });
  });

  describe('conflicts', () => {
    it('should increment conflicts', () => {
      const { addConflict } = useSyncStore.getState();

      addConflict();
      expect(useSyncStore.getState().conflicts).toBe(1);

      addConflict();
      expect(useSyncStore.getState().conflicts).toBe(2);
    });

    it('should clear incidents and conflicts', () => {
      const { addConflict, addIncident, clearIncidents } = useSyncStore.getState();

      addConflict();
      addConflict();
      addIncident('products', 'Error 1');
      addIncident('providers', 'Error 2');

      clearIncidents();

      expect(useSyncStore.getState().conflicts).toBe(0);
      expect(useSyncStore.getState().incidents).toEqual([]);
    });
  });

  describe('incidents', () => {
    it('should add incidents', () => {
      const { addIncident } = useSyncStore.getState();

      addIncident('products', 'Sync failed');

      const state = useSyncStore.getState();
      expect(state.incidents.length).toBe(1);
      expect(state.incidents[0].table).toBe('products');
      expect(state.incidents[0].error).toBe('Sync failed');
      expect(state.incidents[0].time).toBeDefined();
    });

    it('should limit incidents to 10', () => {
      const { addIncident } = useSyncStore.getState();

      for (let i = 0; i < 15; i++) {
        addIncident('table', `Error ${i}`);
      }

      expect(useSyncStore.getState().incidents.length).toBe(10);
    });

    it('should add newest incident first', () => {
      const { addIncident } = useSyncStore.getState();

      addIncident('table1', 'First');
      const firstTime = useSyncStore.getState().incidents[0].time;

      addIncident('table2', 'Second');
      const secondTime = useSyncStore.getState().incidents[0].time;

      expect(secondTime).toBeGreaterThanOrEqual(firstTime);
      expect(useSyncStore.getState().incidents[0].error).toBe('Second');
    });
  });

  describe('supabase connection', () => {
    it('should set supabase connected status', () => {
      const { setSupabaseConnected } = useSyncStore.getState();

      setSupabaseConnected(false);
      expect(useSyncStore.getState().isSupabaseConnected).toBe(false);

      setSupabaseConnected(true);
      expect(useSyncStore.getState().isSupabaseConnected).toBe(true);
    });
  });

  describe('latency', () => {
    it('should set latency', () => {
      const { setLatency } = useSyncStore.getState();

      setLatency(150);
      expect(useSyncStore.getState().latencyMs).toBe(150);
    });

    it('should set latency to null', () => {
      const { setLatency } = useSyncStore.getState();

      setLatency(150);
      setLatency(null);
      expect(useSyncStore.getState().latencyMs).toBeNull();
    });
  });
});
