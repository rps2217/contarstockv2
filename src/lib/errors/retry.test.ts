/**
 * Tests for retry utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, calculateBackoff, sleep, retryable } from './retry';

describe('retry utilities', () => {
  describe('calculateBackoff', () => {
    it('should return base delay on first attempt', () => {
      const delay = calculateBackoff(0, 1000, 30000, 2);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1300); // with jitter
    });

    it('should increase delay exponentially', () => {
      const delay0 = calculateBackoff(0, 1000, 30000, 2);
      const delay1 = calculateBackoff(1, 1000, 30000, 2);
      expect(delay1).toBeGreaterThan(delay0);
    });

    it('should not exceed max delay', () => {
      const delay = calculateBackoff(10, 1000, 5000, 2);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('sleep', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      
      const promise = withRetry(fn, { maxRetries: 3, baseDelay: 100 });
      
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      
      const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100 });
      
      await vi.advanceTimersByTimeAsync(500);
      
      await expect(promise).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const onRetry = vi.fn();
      
      const promise = withRetry(fn, { maxRetries: 1, baseDelay: 100 }, onRetry);
      
      await vi.advanceTimersByTimeAsync(300);
      
      await expect(promise).rejects.toThrow();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('retryable decorator', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      
      class TestService {
        @retryable({ maxRetries: 2, baseDelay: 10 })
        async failingMethod(): Promise<string> {
          attempts++;
          if (attempts < 3) {
            throw new Error('fails');
          }
          return 'success';
        }
      }

      vi.useFakeTimers();
      
      const service = new TestService();
      const result = await service.failingMethod();
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
      
      vi.useRealTimers();
    });
  });
});
