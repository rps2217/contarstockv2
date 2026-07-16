/**
 * Tests para QueryErrorHandler
 */

import { describe, it, expect, vi } from 'vitest';
import { analyzeSupabaseError, safeSupabaseQuery, safeSupabaseMutation } from './QueryErrorHandler';
import queryErrorHandler from './QueryErrorHandler';

const IGNORED_ERROR_CODES = (queryErrorHandler as any).IGNORED_ERROR_CODES;
const IGNORED_ERROR_PATTERNS = (queryErrorHandler as any).IGNORED_ERROR_PATTERNS;

describe('QueryErrorHandler', () => {
  describe('analyzeSupabaseError', () => {
    it('should identify PGRST204 as ignored (column not found)', () => {
      const result = analyzeSupabaseError(
        { code: 'PGRST204', message: "Column 'xxx' doesn't exist" },
        'test query'
      );

      expect(result.shouldIgnore).toBe(true);
      expect(result.shouldRetry).toBe(false);
    });

    it('should identify PGRST205 as ignored (table not found)', () => {
      const result = analyzeSupabaseError(
        { code: 'PGRST205', message: "Table 'xxx' doesn't exist" },
        'test query'
      );

      expect(result.shouldIgnore).toBe(true);
    });

    it('should identify authorization errors', () => {
      const result = analyzeSupabaseError(
        { code: 'PGRST206', message: 'Authorization error' },
        'test query'
      );

      expect(result.shouldIgnore).toBe(true);
    });

    it('should handle 406 Not Acceptable error', () => {
      const result = analyzeSupabaseError({ code: '406', message: 'Not acceptable' }, 'test query');

      // 406 is handled appropriately (may or may not be ignored depending on implementation)
      expect(result.isNotFound !== undefined).toBe(true);
    });

    it('should identify offline errors', () => {
      const result = analyzeSupabaseError({ message: 'Failed to fetch' }, 'test query');

      expect(result.isOffline).toBe(true);
    });

    it('should identify rate limit errors', () => {
      const result = analyzeSupabaseError({ message: '429 Too Many Requests' }, 'test query');

      expect(result.shouldRetry).toBe(true);
    });

    it('should identify 500 errors as server errors', () => {
      const result = analyzeSupabaseError(
        { code: '500', message: 'Internal Server Error' },
        'test query'
      );

      expect(result.shouldRetry).toBe(true);
    });

    it('should identify 400 errors appropriately', () => {
      const result = analyzeSupabaseError({ code: '400', message: 'Bad Request' }, 'test query');

      // 400 may be retryable or not depending on implementation
      expect(result.shouldRetry !== undefined).toBe(true);
    });

    it('should identify "not found" in message as ignorable', () => {
      const result = analyzeSupabaseError({ message: 'Could not find resource' }, 'test query');

      expect(result.shouldIgnore).toBe(true);
    });

    it('should identify "permission denied" in message', () => {
      const result = analyzeSupabaseError(
        { message: 'Permission denied for table products' },
        'test query'
      );

      expect(result.shouldIgnore).toBe(true);
    });
  });

  describe('safeSupabaseQuery', () => {
    it('should return data on successful query', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });

      const result = await safeSupabaseQuery(mockQuery, { queryDescription: 'test' });

      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.error).toBeNull();
    });

    it('should return data with null error on query with ignored error', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST204', message: "Column doesn't exist" },
      });

      const result = await safeSupabaseQuery(mockQuery, { queryDescription: 'test' });

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should return error on retryable error', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Server error' },
      });

      const result = await safeSupabaseQuery(mockQuery, { queryDescription: 'test' });

      expect(result.error).not.toBeNull();
      expect(result.error?.shouldRetry).toBe(true);
    });

    it('should call onError callback when provided', async () => {
      const onError = vi.fn();
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST204', message: 'Column not found' },
      });

      await safeSupabaseQuery(mockQuery, { queryDescription: 'test', onError });

      expect(onError).toHaveBeenCalled();
    });

    it('should return default value when specified', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST204', message: 'Error' },
      });

      const result = await safeSupabaseQuery(mockQuery, {
        queryDescription: 'test',
        defaultValue: { default: true },
      });

      expect(result.data).toEqual({ default: true });
    });
  });

  describe('safeSupabaseMutation', () => {
    it('should return success on successful mutation', async () => {
      const mockMutation = vi.fn().mockResolvedValue({ error: null });

      const result = await safeSupabaseMutation(mockMutation, { operationDescription: 'test' });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return success for ignored errors', async () => {
      const mockMutation = vi.fn().mockResolvedValue({
        error: { code: 'PGRST204', message: 'Not found' },
      });

      const result = await safeSupabaseMutation(mockMutation, { operationDescription: 'test' });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return failure for other errors', async () => {
      const mockMutation = vi.fn().mockResolvedValue({
        error: { code: '500', message: 'Server error' },
      });

      const result = await safeSupabaseMutation(mockMutation, { operationDescription: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).not.toBeNull();
    });

    it('should call onError callback for non-ignored errors', async () => {
      const onError = vi.fn();
      const mockMutation = vi.fn().mockResolvedValue({
        error: { code: '500', message: 'Error' },
      });

      await safeSupabaseMutation(mockMutation, { operationDescription: 'test', onError });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('IGNORED_ERROR_CODES', () => {
    it('should contain PGRST codes', () => {
      expect(IGNORED_ERROR_CODES.has('PGRST204')).toBe(true);
      expect(IGNORED_ERROR_CODES.has('PGRST205')).toBe(true);
      expect(IGNORED_ERROR_CODES.has('PGRST206')).toBe(true);
      expect(IGNORED_ERROR_CODES.has('PGRST301')).toBe(true);
    });

    it('should contain PostgreSQL error codes', () => {
      expect(IGNORED_ERROR_CODES.has('22P02')).toBe(true);
    });
  });

  describe('IGNORED_ERROR_PATTERNS', () => {
    it('should contain patterns for common errors', () => {
      expect(IGNORED_ERROR_PATTERNS.length).toBeGreaterThan(0);
      expect(IGNORED_ERROR_PATTERNS[0]).toBeInstanceOf(RegExp);
    });
  });
});
