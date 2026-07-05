/**
 * useGlobalSearch - Hook compartido para búsqueda global
 * 
 * Proporciona funcionalidad de búsqueda unificada en la aplicación.
 * 
 * Uso:
 * ```tsx
 * import { useGlobalSearch } from '@/shared/hooks';
 * 
 * const { query, results, search, isSearching } = useGlobalSearch();
 * 
 * // Ejecutar búsqueda
 * search('producto 123');
 * 
 * // Ver resultados
 * results.products // Búsqueda en productos
 * results.customers // Búsqueda en clientes
 * results.sessions // Búsqueda en sesiones
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export interface SearchResult {
  type: 'product' | 'customer' | 'session' | 'event' | 'expiry';
  id: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResults {
  products: SearchResult[];
  customers: SearchResult[];
  sessions: SearchResult[];
  total: number;
}

export interface UseGlobalSearchOptions {
  /** Tables to search in */
  tables?: ('products' | 'customers' | 'sessions' | 'events' | 'expiry')[];
  /** Maximum results per table */
  maxResults?: number;
  /** Enable fuzzy search */
  fuzzy?: boolean;
}

export interface UseGlobalSearchReturn {
  /** Current search query */
  query: string;
  /** Results grouped by table */
  results: SearchResults;
  /** Loading state */
  isSearching: boolean;
  /** Execute search */
  search: (query: string) => void;
  /** Clear results */
  clear: () => void;
  /** Quick search (debounced internally) */
  quickSearch: (query: string) => void;
}

const DEFAULT_TABLES = ['products', 'sessions'] as const;
const DEFAULT_MAX_RESULTS = 10;

export function useGlobalSearch(
  options: UseGlobalSearchOptions = {}
): UseGlobalSearchReturn {
  const {
    tables = DEFAULT_TABLES,
    maxResults = DEFAULT_MAX_RESULTS,
    fuzzy = false,
  } = options;

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    products: [],
    customers: [],
    sessions: [],
    total: 0,
  });

  // Normalize search query
  const normalizeQuery = (q: string): string => {
    return q.trim().toLowerCase();
  };

  // Search products
  const searchProducts = useCallback(async (q: string): Promise<SearchResult[]> => {
    if (!tables.includes('products')) return [];
    
    const normalizedQ = normalizeQuery(q);
    if (!normalizedQ) return [];

    try {
      const products = await db.products
        .filter(p => 
          p.barcode?.toLowerCase().includes(normalizedQ) ||
          p.name?.toLowerCase().includes(normalizedQ) ||
          p.sku?.toLowerCase().includes(normalizedQ)
        )
        .limit(maxResults)
        .toArray();

      return products.map(p => ({
        type: 'product' as const,
        id: p.id?.toString() || '',
        title: p.name || 'Sin nombre',
        subtitle: p.barcode ? `Barcode: ${p.barcode}` : undefined,
        metadata: { sku: p.sku, quantity: p.quantity },
      }));
    } catch {
      return [];
    }
  }, [tables, maxResults]);

  // Search customers
  const searchCustomers = useCallback(async (q: string): Promise<SearchResult[]> => {
    if (!tables.includes('customers')) return [];
    
    const normalizedQ = normalizeQuery(q);
    if (!normalizedQ) return [];

    try {
      const customers = await db.customers
        .filter(c =>
          c.name?.toLowerCase().includes(normalizedQ) ||
          c.email?.toLowerCase().includes(normalizedQ) ||
          c.rut?.toLowerCase().includes(normalizedQ)
        )
        .limit(maxResults)
        .toArray();

      return customers.map(c => ({
        type: 'customer' as const,
        id: c.id?.toString() || '',
        title: c.name || 'Sin nombre',
        subtitle: c.email || c.rut,
        metadata: { rut: c.rut },
      }));
    } catch {
      return [];
    }
  }, [tables, maxResults]);

  // Search sessions
  const searchSessions = useCallback(async (q: string): Promise<SearchResult[]> => {
    if (!tables.includes('sessions')) return [];
    
    const normalizedQ = normalizeQuery(q);
    if (!normalizedQ) return [];

    try {
      const sessions = await db.sessions
        .filter(s =>
          s.id?.toString().includes(normalizedQ) ||
          s.sessionType?.toLowerCase().includes(normalizedQ) ||
          s.erpOrder?.toLowerCase().includes(normalizedQ)
        )
        .limit(maxResults)
        .toArray();

      return sessions.map(s => ({
        type: 'session' as const,
        id: s.id?.toString() || '',
        title: `Sesión ${s.sessionType || 'General'}`,
        subtitle: s.erpOrder ? `Orden: ${s.erpOrder}` : undefined,
        metadata: { status: s.status, sessionType: s.sessionType },
      }));
    } catch {
      return [];
    }
  }, [tables, maxResults]);

  // Main search function
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ products: [], customers: [], sessions: [], total: 0 });
      setQuery('');
      return;
    }

    setIsSearching(true);
    setQuery(q);

    try {
      const [products, customers, sessions] = await Promise.all([
        searchProducts(q),
        searchCustomers(q),
        searchSessions(q),
      ]);

      const total = products.length + customers.length + sessions.length;

      setResults({
        products,
        customers,
        sessions,
        total,
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchProducts, searchCustomers, searchSessions]);

  // Quick search (alias for search)
  const quickSearch = useCallback((q: string) => {
    search(q);
  }, [search]);

  // Clear results
  const clear = useCallback(() => {
    setQuery('');
    setResults({ products: [], customers: [], sessions: [], total: 0 });
  }, []);

  return {
    query,
    results,
    isSearching,
    search,
    clear,
    quickSearch,
  };
}

export default useGlobalSearch;