/**
 * Tests for CircuitBreaker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from './circuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should report zero failures and successes', () => {
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
    });
  });

  describe('CLOSED state', () => {
    it('should track failures', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (_err) {
          // Expected error, ignore
        }
      }

      expect(circuitBreaker.getMetrics().failures).toBe(3);
    });

    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);
      expect(result).toBe('success');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (_err) {
          // Expected error, ignore
        }
      }
    });

    it('should reject calls when OPEN', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(fn)).rejects.toThrow('Circuit breaker open');
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (_err) {
          // Expected error, ignore
        }
      }
      circuitBreaker.reset();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });
});
