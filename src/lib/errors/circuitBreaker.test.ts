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
      timeout: 100
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
    it('should transition to OPEN after failure threshold', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('fail');
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reset failures on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      // Fail twice
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(fn)).rejects.toThrow();
      }

      expect(circuitBreaker.getMetrics().failures).toBe(2);

      // Success resets failures
      await circuitBreaker.execute(fn);
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });

    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);
      expect(result).toBe('success');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Open the circuit
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject calls immediately when OPEN', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(fn)).rejects.toThrow('Circuit breaker open');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      vi.useFakeTimers();
      
      // Wait for timeout
      await vi.advanceTimersByTimeAsync(150);
      
      const fn = vi.fn().mockResolvedValue('success');
      
      // Should not throw, goes to HALF_OPEN
      await circuitBreaker.execute(fn);
      
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      vi.useRealTimers();
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      
      // Open the circuit
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      }
      
      // Wait for timeout
      await vi.advanceTimersByTimeAsync(150);
      
      vi.useRealTimers();
    });

    it('should allow calls in HALF_OPEN', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      await circuitBreaker.execute(fn);
      expect(fn).toHaveBeenCalled();
    });

    it('should transition to CLOSED after success threshold', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      // Two successes to close
      await circuitBreaker.execute(fn);
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      await circuitBreaker.execute(fn);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));

      await circuitBreaker.execute(failingFn);
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      // Open the circuit
      const failingFn = vi.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      }
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });
  });
});
