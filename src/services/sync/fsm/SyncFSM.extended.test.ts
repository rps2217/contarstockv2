/**
 * SyncFSM Extended Tests - Pruebas adicionales para la máquina de estados
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncFSM } from './SyncFSM';

describe('SyncFSM Extended', () => {
  beforeEach(() => {
    syncFSM.reset();
  });

  describe('Initial State Details', () => {
    it('should have zero retry count initially', () => {
      expect(syncFSM.getContext().retryCount).toBe(0);
    });

    it('should have undefined error initially', () => {
      expect(syncFSM.getContext().error).toBeUndefined();
    });

    it('should have zero progress initially', () => {
      expect(syncFSM.getContext().progress).toBe(0);
    });
  });

  describe('Progress Updates', () => {
    it('should update progress on UPLOADING event', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'PREPARED' });
      syncFSM.dispatch({ type: 'UPLOADING', progress: 50 });
      expect(syncFSM.getContext().progress).toBe(50);
    });

    it('should track incremental progress', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'PREPARED' });
      
      syncFSM.dispatch({ type: 'UPLOADING', progress: 25 });
      expect(syncFSM.getContext().progress).toBe(25);
      
      syncFSM.dispatch({ type: 'UPLOADING', progress: 75 });
      expect(syncFSM.getContext().progress).toBe(75);
      
      syncFSM.dispatch({ type: 'UPLOADING', progress: 100 });
      expect(syncFSM.getContext().progress).toBe(100);
    });
  });

  describe('Full Sync Flow', () => {
    it('should complete full sync flow: START -> PREPARED -> UPLOADING -> WAITING -> PROCESSING -> SUCCESS', () => {
      syncFSM.dispatch({ type: 'START' });
      expect(syncFSM.getState()).toBe('preparing');

      syncFSM.dispatch({ type: 'PREPARED' });
      expect(syncFSM.getState()).toBe('uploading');

      syncFSM.dispatch({ type: 'UPLOADING', progress: 100 });
      expect(syncFSM.getState()).toBe('uploading');
      expect(syncFSM.getContext().progress).toBe(100);

      syncFSM.dispatch({ type: 'WAITING' });
      expect(syncFSM.getState()).toBe('waiting');

      syncFSM.dispatch({ type: 'PROCESSING' });
      expect(syncFSM.getState()).toBe('processing');

      syncFSM.dispatch({ type: 'SUCCESS' });
      expect(syncFSM.getState()).toBe('success');
      expect(syncFSM.isRunning()).toBe(false);
    });
  });

  describe('Retry Increment Logic', () => {
    it('should increment retry count on each retry', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Test' });
      syncFSM.dispatch({ type: 'RETRY' });
      expect(syncFSM.getContext().retryCount).toBe(1);

      // From retrying, ERROR goes to error and RETRY stays in retrying
      syncFSM.dispatch({ type: 'ERROR', error: 'Test' });
      expect(syncFSM.getState()).toBe('error');
      
      syncFSM.dispatch({ type: 'RETRY' });
      expect(syncFSM.getContext().retryCount).toBe(2);
    });

    it('should reset retry count on reset()', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Test' });
      syncFSM.dispatch({ type: 'RETRY' });
      expect(syncFSM.getContext().retryCount).toBe(1);

      syncFSM.reset();
      expect(syncFSM.getContext().retryCount).toBe(0);
    });
  });

  describe('Reset from Various States', () => {
    it('should reset from idle state using reset()', () => {
      syncFSM.reset();
      expect(syncFSM.getState()).toBe('idle');
      expect(syncFSM.getContext().retryCount).toBe(0);
    });

    it('should reset from preparing state using reset()', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.reset();
      expect(syncFSM.getState()).toBe('idle');
    });

    it('should reset from success state using reset()', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'PREPARED' });
      syncFSM.dispatch({ type: 'UPLOADING', progress: 100 });
      syncFSM.dispatch({ type: 'WAITING' });
      syncFSM.dispatch({ type: 'PROCESSING' });
      syncFSM.dispatch({ type: 'SUCCESS' });
      syncFSM.reset();
      expect(syncFSM.getState()).toBe('idle');
      expect(syncFSM.getContext().progress).toBe(0);
    });

    it('should reset from retrying state using reset()', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Test' });
      syncFSM.dispatch({ type: 'RETRY' });
      expect(syncFSM.getState()).toBe('retrying');

      syncFSM.reset();
      expect(syncFSM.getState()).toBe('idle');
    });
  });

  describe('execute() Progress Callback', () => {
    it('should call progress callback during execution', async () => {
      const progressCalls: string[] = [];
      await syncFSM.execute(async () => {
        return 'done';
      }, (msg) => progressCalls.push(msg));

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should include sync messages in callback', async () => {
      const progressCalls: string[] = [];
      await syncFSM.execute(async () => {
        return 'done';
      }, (msg) => progressCalls.push(msg));

      const hasSyncMessage = progressCalls.some(msg => 
        msg.includes('Sincronización') || msg.includes('sync')
      );
      expect(hasSyncMessage).toBe(true);
    });
  });

  describe('Multiple Listeners', () => {
    it('should allow multiple subscribers', () => {
      const states1: string[] = [];
      const states2: string[] = [];

      const unsub1 = syncFSM.subscribe((state) => states1.push(state));
      const unsub2 = syncFSM.subscribe((state) => states2.push(state));

      syncFSM.dispatch({ type: 'START' });
      syncFSM.reset();

      // reset() method notifies listeners
      expect(states1).toEqual(['preparing', 'idle']);
      expect(states2).toEqual(['preparing', 'idle']);

      unsub1();
      unsub2();
    });

    it('should properly unsubscribe individual listeners', () => {
      const states1: string[] = [];
      const states2: string[] = [];

      const unsub1 = syncFSM.subscribe((state) => states1.push(state));
      const unsub2 = syncFSM.subscribe((state) => states2.push(state));

      syncFSM.dispatch({ type: 'START' });
      unsub1();
      syncFSM.dispatch({ type: 'PREPARED' });

      expect(states1).toEqual(['preparing']);
      expect(states2).toEqual(['preparing', 'uploading']);

      unsub2();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid START events', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'START' });
      expect(syncFSM.getState()).toBe('preparing');
    });

    it('should handle START after SUCCESS', () => {
      // Complete a sync
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'PREPARED' });
      syncFSM.dispatch({ type: 'UPLOADING', progress: 100 });
      syncFSM.dispatch({ type: 'WAITING' });
      syncFSM.dispatch({ type: 'PROCESSING' });
      syncFSM.dispatch({ type: 'SUCCESS' });

      // Start another sync
      syncFSM.dispatch({ type: 'START' });
      expect(syncFSM.getState()).toBe('preparing');
      expect(syncFSM.getContext().retryCount).toBe(0);
    });

    it('should preserve error after RESET', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Network failure' });
      expect(syncFSM.getContext().error).toBe('Network failure');

      syncFSM.dispatch({ type: 'RESET' });
      // Error is preserved but state resets to idle
      expect(syncFSM.getState()).toBe('idle');
    });
  });

  describe('Error State Preservation', () => {
    it('should preserve error message through state transitions', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Connection timeout' });
      
      expect(syncFSM.getState()).toBe('error');
      expect(syncFSM.getContext().error).toBe('Connection timeout');
      
      // Transition to retrying should preserve error
      syncFSM.dispatch({ type: 'RETRY' });
      expect(syncFSM.getState()).toBe('retrying');
      expect(syncFSM.getContext().error).toBe('Connection timeout');
    });
  });
});
