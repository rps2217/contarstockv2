/**
 * Retry utilities with exponential backoff
 */

import { SyncError } from './SyncError';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (new (...args: any[]) => Error)[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [TypeError, ReferenceError],
  onRetry: () => {}
};

/**
 * Calculate delay with exponential backoff and jitter
 */
export const calculateBackoff = (
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number
): number => {
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if an error is retryable
 */
export const isRetryable = (
  error: Error,
  retryableErrors?: (new (...args: any[]) => Error)[]
): boolean => {
  if (!retryableErrors || retryableErrors.length === 0) {
    return true;
  }
  return retryableErrors.some(
    ErrorClass => error instanceof ErrorClass
  );
};

/**
 * Execute a function with retry logic
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  onRetry?: (attempt: number, error: Error, delay: number) => void
): Promise<T> => {
  const opts: Required<RetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryable(lastError, opts.retryableErrors)) {
        throw lastError;
      }

      const delay = calculateBackoff(
        attempt,
        opts.baseDelay,
        opts.maxDelay!,
        opts.backoffMultiplier!
      );

      opts.onRetry?.(attempt + 1, lastError, delay);
      onRetry?.(attempt + 1, lastError, delay);
      await sleep(delay);
    }
  }

  throw lastError!;
};

/**
 * Retry decorator for class methods
 */
export const retryable = (options: Partial<RetryOptions> = {}) => {
  return function <T>(
    _target: object,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<T>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: any[]): Promise<T> {
      return withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
};
