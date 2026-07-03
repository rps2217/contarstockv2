/**
 * Tests para retry utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  withRetry, 
  withSyncRetry, 
  withCircuitBreaker,
  calculateBackoff,
  isRetryableError,
  sleep,
  resetCircuitBreaker
} from './retry';

describe('retry utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateBackoff(1, 1000, 30000, 2)).toBeGreaterThan(750);
      expect(calculateBackoff(1, 1000, 30000, 2)).toBeLessThan(1250);
      
      expect(calculateBackoff(2, 1000, 30000, 2)).toBeGreaterThan(1500);
      expect(calculateBackoff(2, 1000, 30000, 2)).toBeLessThan(2500);
    });

    it('should not exceed maxDelay', () => {
      expect(calculateBackoff(10, 1000, 30000, 2)).toBeLessThanOrEqual(37500); // max + 25% jitter
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('Failed to fetch'), [])).toBe(true);
      expect(isRetryableError('Network request failed', [])).toBe(true);
      expect(isRetryableError(new Error('timeout'), [])).toBe(true);
    });

    it('should identify auth errors as non-retryable', () => {
      expect(isRetryableError(new Error('401 Unauthorized'), [])).toBe(false);
      expect(isRetryableError(new Error('not authenticated'), [])).toBe(false);
    });

    it('should identify duplicate key as non-retryable', () => {
      expect(isRetryableError(new Error('duplicate key'), [])).toBe(false);
      expect(isRetryableError(new Error('unique constraint'), [])).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = withRetry(fn, { maxRetries: 3 });
      
      // Run all timers to completion
      await vi.runAllTimersAsync();
      
      expect(await result).toEqual({
        success: true,
        data: 'success',
        attempts: 1,
        totalDuration: expect.any(Number)
      });
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      
      const result = withRetry(fn, { maxRetries: 3, baseDelay: 100 });
      
      await vi.runAllTimersAsync();
      
      const finalResult = await result;
      expect(finalResult.success).toBe(true);
      expect(finalResult.attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));
      
      const result = withRetry(fn, { maxRetries: 2, baseDelay: 100 });
      
      await vi.runAllTimersAsync();
      
      const finalResult = await result;
      expect(finalResult.success).toBe(false);
      expect(finalResult.attempts).toBe(3); // initial + 2 retries
    });
  });

  describe('withCircuitBreaker', () => {
    it('should allow requests when circuit is closed', async () => {
      resetCircuitBreaker('test');
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = withCircuitBreaker(fn, 'test', { maxRetries: 1 });
      
      await vi.runAllTimersAsync();
      
      expect(await result).toEqual({
        success: true,
        data: 'success',
        attempts: 1,
        totalDuration: expect.any(Number)
      });
    });

    it('should open circuit after failures', async () => {
      resetCircuitBreaker('test2');
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      
      // First few should fail and eventually open circuit
      for (let i = 0; i < 6; i++) {
        const result = withCircuitBreaker(fn, 'test2', { 
          maxRetries: 0,
          failureThreshold: 5 
        });
        await vi.runAllTimersAsync();
        await result;
      }
      
      // Next request should be rejected
      const blockedResult = withCircuitBreaker(fn, 'test2', { maxRetries: 0 });
      const result = await blockedResult;
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker open');
    });
  });
});
