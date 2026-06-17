import { describe, it, expect } from 'vitest';
import { ServiceError, handleError, tryCatch } from './utilityTypes';

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
  });

  it('should handle null', () => {
    const result = handleError(null);
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
  });

  it('should handle undefined', () => {
    const result = handleError(undefined);
    expect(result).toBeInstanceOf(ServiceError);
    expect(result.message).toBe('Unknown error');
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
});
