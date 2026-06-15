import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleError, withErrorHandling, wrapError } from '@/services/errorHandler';

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('debería clasificar errores de red correctamente', () => {
      const networkError = new Error('Network timeout');
      const result = handleError(networkError);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Network timeout');
    });

    it('debería clasificar errores de sync correctamente', () => {
      const syncError = new Error('Supabase sync failed');
      const result = handleError(syncError);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Supabase sync failed');
    });

    it('debería clasificar errores de base de datos correctamente', () => {
      const dbError = new Error('IndexedDB error: quota exceeded');
      const result = handleError(dbError);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('IndexedDB error: quota exceeded');
    });

    it('debería aceptar opciones personalizadas', () => {
      const error = new Error('Test error');
      const result = handleError(error, {
        severity: 'critical',
        context: 'sync',
        showToast: false,
      });
      
      expect(result).toBeInstanceOf(Error);
    });

    it('debería manejar errores que no son instancias de Error', () => {
      const stringError = 'Error as string';
      const result = handleError(stringError);
      
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Error as string');
    });
  });

  describe('withErrorHandling', () => {
    it('debería retornar el resultado si la función succeeds', async () => {
      const testFn = vi.fn().mockResolvedValue('success');
      
      const result = await withErrorHandling(testFn);
      
      expect(result).toBe('success');
      expect(testFn).toHaveBeenCalledTimes(1);
    });

    it('debería retornar null si la función falla', async () => {
      const testFn = vi.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await withErrorHandling(testFn);
      
      expect(result).toBeNull();
      expect(testFn).toHaveBeenCalledTimes(1);
    });

    it('debería aceptar opciones personalizadas', async () => {
      const testFn = vi.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await withErrorHandling(testFn, {
        context: 'sync',
        showToast: false,
      });
      
      expect(result).toBeNull();
    });
  });

  describe('wrapError', () => {
    it('debería envolver un error con contexto', () => {
      const originalError = new Error('Original error');
      const wrapped = wrapError(originalError, 'DatabaseOperation');
      
      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('DatabaseOperation: Original error');
      expect(wrapped.stack).toBe(originalError.stack);
    });

    it('debería manejar errores que no son instancias de Error', () => {
      const stringError = 'String error';
      const wrapped = wrapError(stringError, 'Context');
      
      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('Context: String error');
    });
  });
});