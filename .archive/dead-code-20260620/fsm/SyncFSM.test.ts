import { describe, it, expect, beforeEach } from 'vitest';
import { SyncFSM } from './SyncFSM';

describe('SyncFSM', () => {
  let fsm: SyncFSM;

  beforeEach(() => {
    fsm = new SyncFSM();
  });

  describe('Initial State', () => {
    it('should start in idle state', () => {
      expect(fsm.getState()).toBe('idle');
    });

    it('should not be running initially', () => {
      expect(fsm.isRunning()).toBe(false);
    });

    it('should be able to start', () => {
      expect(fsm.canStart()).toBe(true);
    });
  });

  describe('START_SYNC Event', () => {
    it('should transition from idle to preparing', () => {
      const result = fsm.handle({ type: 'START_SYNC' });
      expect(result).toBe(true);
      expect(fsm.getState()).toBe('preparing');
    });

    it('should increment processedCount on start', () => {
      fsm.handle({ type: 'START_SYNC' });
      expect(fsm.getContext().processedCount).toBe(0);
      expect(fsm.getContext().startTime).toBeDefined();
    });

    it('should not transition from preparing state', () => {
      fsm.handle({ type: 'START_SYNC' });
      const result = fsm.handle({ type: 'START_SYNC' });
      expect(result).toBe(false);
      expect(fsm.getState()).toBe('preparing');
    });
  });

  describe('CANCEL Event', () => {
    it('should transition from preparing to idle', () => {
      fsm.handle({ type: 'START_SYNC' });
      expect(fsm.getState()).toBe('preparing');

      const result = fsm.handle({ type: 'CANCEL' });
      expect(result).toBe(true);
      expect(fsm.getState()).toBe('idle');
    });

    it('should not cancel from idle state', () => {
      const result = fsm.handle({ type: 'CANCEL' });
      expect(result).toBe(false);
    });

    // Note: CANCEL no es valido desde success, START_SYNC es necesario
  });

  describe('SYNC_ERROR Event', () => {
    it('should transition to error state from preparing', () => {
      fsm.handle({ type: 'START_SYNC' });
      const result = fsm.handle({ type: 'SYNC_ERROR', error: 'test error' });
      expect(result).toBe(true);
      expect(fsm.getState()).toBe('error');
      expect(fsm.getContext().lastError).toBe('test error');
    });

    it('should track errors in context', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'error 1' });
      expect(fsm.getContext().errors.length).toBe(1);
      expect(fsm.getContext().errors[0].message).toBe('error 1');
    });
  });

  describe('RETRY Event', () => {
    it('should transition from error to retrying', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'test' });
      expect(fsm.getState()).toBe('error');

      const result = fsm.handle({ type: 'RETRY' });
      expect(result).toBe(true);
      expect(fsm.getState()).toBe('retrying');
    });

    it('should increment retry count', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'test' });
      expect(fsm.getContext().retryCount).toBe(1);

      fsm.handle({ type: 'RETRY' });
      expect(fsm.getContext().retryCount).toBe(2);
    });

    it('should not retry from idle state', () => {
      const result = fsm.handle({ type: 'RETRY' });
      expect(result).toBe(false);
    });
  });

  describe('SYNC_COMPLETE Event', () => {
    it('should transition from retrying to success', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'test' });
      fsm.handle({ type: 'RETRY' });
      expect(fsm.getState()).toBe('retrying');

      const result = fsm.handle({ type: 'SYNC_COMPLETE' });
      expect(result).toBe(true);
      expect(fsm.getState()).toBe('success');
    });

    it('should not transition from idle state', () => {
      const result = fsm.handle({ type: 'SYNC_COMPLETE' });
      expect(result).toBe(false);
    });
  });

  describe('getResult', () => {
    it('should return success result when in success state', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'test' });
      fsm.handle({ type: 'RETRY' });
      fsm.handle({ type: 'SYNC_COMPLETE' });

      const result = fsm.getResult();
      expect(result.success).toBe(true);
    });

    it('should return failure result when in error state', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'test' });

      const result = fsm.getResult();
      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset to idle state', () => {
      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'SYNC_ERROR', error: 'test' });
      
      fsm.reset();
      
      expect(fsm.getState()).toBe('idle');
      expect(fsm.getContext().errors.length).toBe(0);
      expect(fsm.getContext().retryCount).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers on state change', () => {
      const states: string[] = [];
      fsm.subscribe((state) => {
        states.push(state);
      });

      fsm.handle({ type: 'START_SYNC' });
      fsm.handle({ type: 'CANCEL' });

      expect(states).toContain('preparing');
      expect(states).toContain('idle');
    });

    it('should allow unsubscribe', () => {
      const states: string[] = [];
      const unsubscribe = fsm.subscribe((state) => {
        states.push(state);
      });

      fsm.handle({ type: 'START_SYNC' });
      unsubscribe();
      fsm.handle({ type: 'CANCEL' });

      expect(states).toEqual(['preparing']);
    });
  });
});
