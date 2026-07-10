import { describe, it, expect } from 'vitest';
import { ServiceError, handleError, tryCatch, OperationResult } from './utilityTypes';

describe('ServiceError', () => {
  it('should create error with message only', () => {
    const error = new ServiceError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('ServiceError');
    expect(error.code).toBeUndefined();
    expect(error.context).toBeUndefined();
  });

  it('should create error with code', () => {
    const error = new ServiceError('Error message', 'ERROR_CODE');
    expect(error.message).toBe('Error message');
    expect(error.code).toBe('ERROR_CODE');
  });

  it('should create error with context', () => {
    const error = new ServiceError('Error', 'CODE', { userId: 123 });
    expect(error.context).toEqual({ userId: 123 });
  });

  it('should be instance of Error', () => {
    const error = new ServiceError('Test');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ServiceError).toBe(true);
  });
});

describe('OperationResult', () => {
  it('should have correct structure for success', () => {
    const result: OperationResult<number> = {
      success: true,
      data: 42,
    };
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.error).toBeUndefined();
  });

  it('should have correct structure for error', () => {
    const result: OperationResult<number> = {
      success: false,
      error: 'Something went wrong',
    };
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('Something went wrong');
  });

  it('should work with different data types', () => {
    const stringResult: OperationResult<string> = {
      success: true,
      data: 'hello',
    };
    expect(stringResult.data).toBe('hello');

    const objectResult: OperationResult<{ id: number }> = {
      success: true,
      data: { id: 1 },
    };
    expect(objectResult.data).toEqual({ id: 1 });

    const voidResult: OperationResult<void> = {
      success: true,
    };
    expect(voidResult.data).toBeUndefined();
  });
});

describe('handleError', () => {
  it('should return ServiceError unchanged', () => {
    const original = new ServiceError('Original', 'CODE');
    const result = handleError(original);
    expect(result).toBe(original);
  });

  it('should convert Error to ServiceError', () => {
    const error = new Error('Test error');
    const result = handleError(error);
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Test error');
  });

  it('should add context to Error', () => {
    const error = new Error('Test error');
    const result = handleError(error, 'CONTEXT');
    expect(result.message).toBe('CONTEXT: Test error');
    expect(result.context).toEqual({ context: 'CONTEXT' });
  });

  it('should handle non-Error values', () => {
    const result = handleError('string error');
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
    expect(result.code).toBe('UNKNOWN');
  });

  it('should handle null', () => {
    const result = handleError(null);
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
    expect(result.code).toBe('UNKNOWN');
  });

  it('should handle undefined', () => {
    const result = handleError(undefined);
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
    expect(result.code).toBe('UNKNOWN');
  });

  it('should handle number error', () => {
    const result = handleError(404);
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
  });

  it('should handle object error', () => {
    const result = handleError({ reason: 'test' });
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
  });

  it('should use context in message for unknown error', () => {
    const result = handleError('test', 'MODULE');
    expect(result.message).toBe('MODULE: Unknown error');
    // Note: context is not set for non-Error values
  });
});

describe('tryCatch', () => {
  it('should return data on success', async () => {
    const fn = async () => ({ value: 42 });
    const result = await tryCatch(fn, { value: 0 });
    expect(result.data).toEqual({ value: 42 });
    expect(result.error).toBeNull();
  });

  it('should return fallback on error', async () => {
    const fn = async () => {
      throw new Error('Fail');
    };
    const result = await tryCatch(fn, { value: 0 });
    expect(result.data).toEqual({ value: 0 });
    expect(result.error).toBeInstanceOf(ServiceError);
    expect(result.error?.message).toBe('Fail');
  });

  it('should preserve ServiceError on error', async () => {
    const fn = async () => {
      throw new ServiceError('Service failed', 'SERVICE_ERROR');
    };
    const result = await tryCatch(fn, { value: 0 });
    expect(result.data).toEqual({ value: 0 });
    expect(result.error?.code).toBe('SERVICE_ERROR');
  });

  it('should handle sync function wrapped in promise', async () => {
    const fn = () => Promise.resolve('sync result');
    const result = await tryCatch(fn, 'fallback');
    expect(result.data).toBe('sync result');
    expect(result.error).toBeNull();
  });

  it('should work with void return type', async () => {
    const fn = async (): Promise<void> => {};
    const result = await tryCatch(fn, undefined);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeNull();
  });
});
