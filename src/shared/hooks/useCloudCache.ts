/**
 * useCloudCache - Hook para cachear datos de la nube con TTL
 * 
 * Evita recargas innecesarias de datos que ya tenemos.
 * Útil para datos que no cambian frecuentemente.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  loading: boolean;
}

interface UseCloudCacheOptions {
  ttl?: number; // Time to live en ms (default: 5 minutos)
  enabled?: boolean;
  onStale?: (data: T) => void;
}

export function useCloudCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCloudCacheOptions = {}
): {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  refresh: () => Promise<void>;
  invalidate: () => void;
} {
  const { 
    ttl = 5 * 60 * 1000, // 5 minutos default
    enabled = true,
    onStale 
  } = options;

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    isStale: boolean;
  }>({
    data: null,
    isLoading: false,
    isStale: false,
  });

  const isExpired = useCallback((entry: CacheEntry<T>) => {
    return Date.now() - entry.timestamp > ttl;
  }, [ttl]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const cached = cacheRef.current.get(key);
    
    // Si hay cache válido y no forzamos refresh, usar cache
    if (cached && !forceRefresh && !isExpired(cached)) {
      setState({
        data: cached.data,
        isLoading: false,
        isStale: false,
      });
      return;
    }

    // Si hay cache expirado, marcar como stale pero mostrar datos
    if (cached && isExpired(cached)) {
      setState({
        data: cached.data,
        isLoading: false,
        isStale: true,
      });
      onStale?.(cached.data);
      
      // Refrescar en background
      setState(prev => ({ ...prev, isLoading: true }));
    } else {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    try {
      const freshData = await fetcher();
      const entry: CacheEntry<T> = {
        data: freshData,
        timestamp: Date.now(),
        loading: false,
      };
      cacheRef.current.set(key, entry);
      
      setState({
        data: freshData,
        isLoading: false,
        isStale: false,
      });
    } catch (error) {
      console.error(`[useCloudCache] Error fetching ${key}:`, error);
      // Si falla, mantener datos anteriores si existen
      if (cached) {
        setState({
          data: cached.data,
          isLoading: false,
          isStale: true,
        });
      }
    }
  }, [key, fetcher, enabled, isExpired, onStale, ttl]);

  // Carga inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh manual
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Invalidar cache
  const invalidate = useCallback(() => {
    cacheRef.current.delete(key);
    setState({
      data: null,
      isLoading: false,
      isStale: false,
    });
  }, [key]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isStale: state.isStale,
    refresh,
    invalidate,
  };
}

// Helper para limpiar todo el cache
export function clearAllCache(): void {
  // Necesitamos acceso al cache global - por ahora solo método vacío
  // En producción podrías usar un módulo singleton
}

export default useCloudCache;