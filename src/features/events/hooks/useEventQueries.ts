/**
 * useEventQueries - Hook para consultas de eventos
 * 
 * Maneja todas las operaciones de lectura de la base de datos de eventos.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { eventRepository, productRepository } from '../database';
import { Product } from '../../../types';

export interface UseEventQueriesReturn {
  localEvents: ReturnType<typeof eventRepository.getAll> extends Promise<infer T> ? T : never;
  allProducts: ReturnType<typeof productRepository.getAll> extends Promise<infer T> ? T : never;
  productMap: Map<string, Product>;
  eventCount: number;
  pendingCount: number;
  errorCount: number;
}

/**
 * Hook para obtener todas las consultas de eventos
 */
export const useEventQueries = (): UseEventQueriesReturn => {
  // Live queries para datos reactivos
  const localEvents = useLiveQuery(() => eventRepository.getAll(), []) || [];
  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];

  // Mapa de productos para búsqueda rápida
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of allProducts) {
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    }
    return map;
  }, [allProducts]);

  // Contadores
  const eventCount = localEvents.length;
  const pendingCount = localEvents.filter(e => e.syncStatus === 'pending').length;
  const errorCount = localEvents.filter(e => e.syncStatus === 'error').length;

  return {
    localEvents,
    allProducts,
    productMap,
    eventCount,
    pendingCount,
    errorCount,
  };
};

// Helper para normalizar SKU
const normalizeSku = (barcode: string): string => {
  return barcode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};
