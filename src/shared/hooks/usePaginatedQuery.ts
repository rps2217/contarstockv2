/**
 * usePaginatedQuery - Hook para paginación con cursor
 * 
 * Optimiza la carga de datos dividiendo en páginas.
 * Usa cursor-based pagination para mejor performance.
 */

import { useState, useCallback, useEffect } from 'react';

interface UsePaginatedQueryOptions<T, F = unknown> {
  fetchFn: (options: { cursor?: string; limit: number; filter?: F }) => Promise<{
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
  }>;
  initialLimit?: number;
  filter?: F;
  deps?: unknown[];
}

interface UsePaginatedQueryReturn<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number | null;
  loadMore: () => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function usePaginatedQuery<T extends { id: string }, F = unknown>(
  options: UsePaginatedQueryOptions<T, F>
): UsePaginatedQueryReturn<T> {
  const {
    fetchFn,
    initialLimit = 20,
    filter,
    deps = [],
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  const loadPage = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsLoading(true);
        setCursor(undefined);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const result = await fetchFn({
        cursor: isRefresh ? undefined : cursor,
        limit: initialLimit,
        filter,
      });

      if (isRefresh) {
        setItems(result.items);
      } else {
        setItems(prev => [...prev, ...result.items]);
      }
      
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
      if (result.total !== undefined) {
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [fetchFn, cursor, initialLimit, filter]);

  // Carga inicial
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPage(true);
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      loadPage(false);
    }
  }, [isLoadingMore, hasMore, cursor, loadPage]);

  const refresh = useCallback(async () => {
    await loadPage(true);
  }, [loadPage]);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
    setIsLoading(true);
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
    reset,
  };
}

export default usePaginatedQuery;