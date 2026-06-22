/**
 * useProductsStats - Hook para estadísticas de productos usando productsDomain
 * 
 * Combina los datos del repositorio con la lógica de negocio pura del domain.
 */

import { useMemo } from 'react';
import { Product } from '@/types';
import { 
  calculateProductStats, 
  ProductPolicyStatus,
  StockStatus,
  ProductStats 
} from '../domain/productsDomain';

interface UseProductsStatsOptions {
  products: Product[];
  pendingChangesCount?: number;
}

interface UseProductsStatsReturn {
  stats: ProductStats;
  byPolicy: {
    exchange: number;
    loss: number;
    noInfo: number;
    total: number;
  };
  byStock: {
    normal: number;
    low: number;
    critical: number;
    excess: number;
  };
  alerts: {
    lowStock: number;
    missingPolicy: number;
    syncing: number;
    pendingChanges: number;
  };
}

/**
 * Hook que calcula estadísticas de productos usando productsDomain
 */
export const useProductsStats = ({
  products,
  pendingChangesCount = 0
}: UseProductsStatsOptions): UseProductsStatsReturn => {
  
  const stats = useMemo(() => {
    return calculateProductStats(products, pendingChangesCount);
  }, [products, pendingChangesCount]);

  return useMemo(() => ({
    stats,
    byPolicy: {
      exchange: stats.byPolicy[ProductPolicyStatus.EXCHANGE],
      loss: stats.byPolicy[ProductPolicyStatus.LOSS],
      noInfo: stats.byPolicy[ProductPolicyStatus.NO_INFO],
      total: stats.total
    },
    byStock: {
      normal: stats.byStock[StockStatus.NORMAL],
      low: stats.byStock[StockStatus.LOW],
      critical: stats.byStock[StockStatus.CRITICAL],
      excess: stats.byStock[StockStatus.EXCESS]
    },
    alerts: {
      lowStock: stats.lowStock,
      missingPolicy: stats.missingPolicy,
      syncing: stats.syncing,
      pendingChanges: stats.pendingChanges
    }
  }), [stats]);
};

export type { ProductStats };
