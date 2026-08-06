/**
 * productsDomain.ts - Lógica de negocio pura para el módulo de productos
 *
 * Principios:
 * - Sin dependencias de React hooks
 * - Sin estado global
 * - Funciones puras y tipadas
 */

import { Product } from '@/types';
import { normalizeText } from '@/lib/utils';
import type { ProductWithPolicy } from '@/features/product/types';

/**
 * Estados de producto según política
 */
export enum ProductPolicyStatus {
  EXCHANGE = 'EXCHANGE', // Productos con política de cambio/canje
  LOSS = 'LOSS', // Productos con política de pérdida/merma
  NO_INFO = 'NO_INFO', // Productos sin información de política
  ALL = 'ALL', // Todos los productos
}

/**
 * Estados de stock
 */
export enum StockStatus {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  CRITICAL = 'CRITICAL',
  EXCESS = 'EXCESS',
}

/**
 * Configuración de estados para UI
 */
export const PRODUCT_POLICY_CONFIG: Record<
  ProductPolicyStatus,
  {
    label: string;
    color: string;
    bg: string;
    text: string;
    icon: string;
  }
> = {
  [ProductPolicyStatus.EXCHANGE]: {
    label: 'Canje',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: '↺',
  },
  [ProductPolicyStatus.LOSS]: {
    label: 'Merma',
    color: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    icon: '↓',
  },
  [ProductPolicyStatus.NO_INFO]: {
    label: 'Sin Info',
    color: 'bg-slate-500',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    icon: '?',
  },
  [ProductPolicyStatus.ALL]: {
    label: 'Todos',
    color: 'bg-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    icon: '☰',
  },
};

/**
 * Configuración de estados de stock
 */
export const STOCK_STATUS_CONFIG: Record<
  StockStatus,
  {
    label: string;
    color: string;
    bg: string;
    text: string;
  }
> = {
  [StockStatus.NORMAL]: {
    label: 'Normal',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
  },
  [StockStatus.LOW]: {
    label: 'Bajo',
    color: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  [StockStatus.CRITICAL]: {
    label: 'Crítico',
    color: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
  },
  [StockStatus.EXCESS]: {
    label: 'Exceso',
    color: 'bg-violet-500',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
  },
};

/**
 * Evalúa el estado de política de un producto
 */
export const evaluateProductPolicy = (
  product: Product | ProductWithPolicy
): ProductPolicyStatus => {
  const p = product as ProductWithPolicy;

  if (p.hasExchange !== undefined) {
    return p.hasExchange ? ProductPolicyStatus.EXCHANGE : ProductPolicyStatus.LOSS;
  }

  if (p.policy?.daysToExpiry !== undefined && p.policy.daysToExpiry > 0) {
    return ProductPolicyStatus.EXCHANGE;
  }

  if (p.withdrawalDays !== undefined && p.withdrawalDays > 0) {
    return ProductPolicyStatus.EXCHANGE;
  }

  return ProductPolicyStatus.NO_INFO;
};

/**
 * Evalúa el estado de stock de un producto
 */
export const evaluateStockStatus = (product: Product | ProductWithPolicy): StockStatus => {
  const currentStock = (product as ProductWithPolicy).currentStock ?? product.stock ?? 0;
  const minStock = product.minStock ?? 0;
  const maxStock = product.stock ? product.stock * 1.5 : 0;

  if (currentStock === 0) {
    return StockStatus.CRITICAL;
  }

  if (currentStock < minStock) {
    return currentStock < minStock * 0.5 ? StockStatus.CRITICAL : StockStatus.LOW;
  }

  if (maxStock > 0 && currentStock > maxStock) {
    return StockStatus.EXCESS;
  }

  return StockStatus.NORMAL;
};

/**

/**
 * Verifica si un producto coincide con la búsqueda
 */
export const productMatchesSearch = (product: Product, query: string): boolean => {
  if (!query.trim()) return true;

  const normalizedQuery = normalizeText(query);
  const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  const searchableFields = [
    product.barcode,
    product.name,
    product.category,
    product.supplier,
    product.sku,
    product.location,
  ].map(normalizeText);

  return searchTerms.every(term => searchableFields.some(field => field.includes(term)));
};

/**
 * Estadísticas de productos
 */
export interface ProductStats {
  total: number;
  byPolicy: Record<ProductPolicyStatus, number>;
  byStock: Record<StockStatus, number>;
  missingPolicy: number;
  lowStock: number;
  syncing: number;
  pendingChanges: number;
}

/**
 * Calcula estadísticas de productos
 */
export const calculateProductStats = (
  products: Product[],
  pendingChangesCount: number = 0
): ProductStats => {
  const stats: ProductStats = {
    total: products.length,
    byPolicy: {
      [ProductPolicyStatus.EXCHANGE]: 0,
      [ProductPolicyStatus.LOSS]: 0,
      [ProductPolicyStatus.NO_INFO]: 0,
      [ProductPolicyStatus.ALL]: 0,
    },
    byStock: {
      [StockStatus.NORMAL]: 0,
      [StockStatus.LOW]: 0,
      [StockStatus.CRITICAL]: 0,
      [StockStatus.EXCESS]: 0,
    },
    missingPolicy: 0,
    lowStock: 0,
    syncing: 0,
    pendingChanges: pendingChangesCount,
  };

  for (const product of products) {
    // Por política
    const policyStatus = evaluateProductPolicy(product);
    stats.byPolicy[policyStatus]++;

    if (policyStatus === ProductPolicyStatus.NO_INFO) {
      stats.missingPolicy++;
    }

    // Por stock
    const stockStatus = evaluateStockStatus(product);
    stats.byStock[stockStatus]++;

    if (stockStatus === StockStatus.LOW || stockStatus === StockStatus.CRITICAL) {
      stats.lowStock++;
    }

    // Por sync
    if (product.syncStatus === 'pending') {
      stats.syncing++;
    }
  }

  return stats;
};

/**
 * Obtiene el label para un estado de política
 */
export const getPolicyLabel = (status: ProductPolicyStatus): string => {
  return PRODUCT_POLICY_CONFIG[status]?.label ?? 'Desconocido';
};

/**
 * Obtiene el label para un estado de stock
 */
export const getStockLabel = (status: StockStatus): string => {
  return STOCK_STATUS_CONFIG[status]?.label ?? 'Desconocido';
};

/**
 * Filtra productos por estado de política
 */
export const filterByPolicy = (
  products: Product[],
  filter: ProductPolicyStatus | 'all'
): Product[] => {
  if (filter === 'all' || filter === ProductPolicyStatus.ALL) {
    return products;
  }

  return products.filter(product => evaluateProductPolicy(product) === filter);
};

/**
 * Ordena productos por criterio
 */
export type SortField = 'name' | 'barcode' | 'category' | 'stock' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export const sortProducts = (
  products: Product[],
  field: SortField = 'name',
  order: SortOrder = 'asc'
): Product[] => {
  const sorted = [...products].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'barcode':
        comparison = (a.barcode || '').localeCompare(b.barcode || '');
        break;
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '');
        break;
      case 'stock':
        comparison = (a.stock || 0) - (b.stock || 0);
        break;
      case 'updatedAt':
        comparison = (a.updatedAt || 0) - (b.updatedAt || 0);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
};
