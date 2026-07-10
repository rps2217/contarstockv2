/**
 * useAsyncState - Hook para manejar estados de operaciones asíncronas
 * 
 * Proporciona un patrón consistente para:
 * - Loading states
 * - Error handling
 * - Datos resultado
 * 
 * Uso:
 * const { data, isLoading, error, execute } = useAsyncState<Product[]>();
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAsyncStateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncStateReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  reset: () => void;
}

export function useAsyncState<T>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T> {
  const {
    onSuccess,
    onError,
    showToast = false,
    successMessage,
    errorMessage,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      setData(result);
      
      if (showToast && successMessage) {
        toast.success(successMessage);
      }
      
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      if (showToast) {
        toast.error(errorMessage || errorObj.message || 'Error inesperado');
      }
      
      onError?.(errorObj);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, showToast, successMessage, errorMessage]);

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    setData,
    reset,
  };
}

// Variante para operaciones que no retornan datos (void)
interface UseAsyncActionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncActionReturn {
  isLoading: boolean;
  error: Error | null;
  execute: (fn: () => Promise<void>) => Promise<boolean>;
  reset: () => void;
}

export function useAsyncAction(
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn {
  const {
    onSuccess,
    onError,
    showToast = false,
    successMessage,
    errorMessage,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await fn();
      
      if (showToast && successMessage) {
        toast.success(successMessage);
      }
      
      onSuccess?.();
      return true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      if (showToast) {
        toast.error(errorMessage || errorObj.message || 'Error inesperado');
      }
      
      onError?.(errorObj);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, showToast, successMessage, errorMessage]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset,
  };
}

export default useAsyncState;