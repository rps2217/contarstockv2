/**
 * SyncFSM Tests - Pruebas unitarias para la máquina de estados
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncFSM } from './SyncFSM';

describe('SyncFSM', () => {
  beforeEach(() => {
    syncFSM.reset();
  });

  describe('Initial State', () => {
    it('should start in idle state', () => {
      expect(syncFSM.getState()).toBe('idle');
    });

    it('should not be running initially', () => {
      expect(syncFSM.isRunning()).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should transition from idle to preparing on START', () => {
      syncFSM.dispatch({ type: 'START' });
      expect(syncFSM.getState()).toBe('preparing');
      expect(syncFSM.isRunning()).toBe(true);
    });

    it('should transition from preparing to uploading on PREPARED', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'PREPARED' });
      expect(syncFSM.getState()).toBe('uploading');
    });

    it('should transition to error on ERROR event from preparing', () => {
      syncFSM.dispatch({ type: 'START' }); // idle -> preparing
      syncFSM.dispatch({ type: 'ERROR', error: 'Test error' });
      expect(syncFSM.getState()).toBe('error');
      expect(syncFSM.getContext().error).toBe('Test error');
    });

    it('should transition to success on SUCCESS event', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'PREPARED' });
      syncFSM.dispatch({ type: 'UPLOADING', progress: 100 });
      syncFSM.dispatch({ type: 'WAITING' });
      syncFSM.dispatch({ type: 'PROCESSING' });
      syncFSM.dispatch({ type: 'SUCCESS' });
      expect(syncFSM.getState()).toBe('success');
      expect(syncFSM.isRunning()).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should transition to error then retry from error state', () => {
      // Primero llegar a error
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Test' });
      expect(syncFSM.getState()).toBe('error');
      
      // RETRY desde error
      syncFSM.dispatch({ type: 'RETRY' });
      expect(syncFSM.getState()).toBe('retrying');
      expect(syncFSM.getContext().retryCount).toBe(1);
    });

    it('should reset to idle on RESET from error', () => {
      syncFSM.dispatch({ type: 'START' });
      syncFSM.dispatch({ type: 'ERROR', error: 'Test' });
      syncFSM.dispatch({ type: 'RESET' });
      expect(syncFSM.getState()).toBe('idle');
      expect(syncFSM.getContext().retryCount).toBe(0);
    });
  });

  describe('execute()', () => {
    it('should execute async action and transition to success', async () => {
      const progress: string[] = [];
      await syncFSM.execute(async () => {
        progress.push('action');
      }, (msg) => progress.push(msg));

      expect(syncFSM.getState()).toBe('success');
      expect(progress).toContain('action');
      expect(progress).toContain('Sincronización completada');
    });

    it('should catch errors and transition to error state', async () => {
      await expect(
        syncFSM.execute(async () => {
          throw new Error('Network error');
        })
      ).rejects.toThrow('Network error');

      expect(syncFSM.getState()).toBe('error');
    });
  });

  describe('Listeners', () => {
    it('should notify subscribers on state change', () => {
      const states: string[] = [];
      const unsubscribe = syncFSM.subscribe((state) => {
        states.push(state);
      });

      syncFSM.dispatch({ type: 'START' });
      unsubscribe();
      syncFSM.dispatch({ type: 'PREPARED' });

      expect(states).toEqual(['preparing']);
    });
  });
});
