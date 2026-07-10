/**
 * Tipos para el módulo de productos
 */

import { Product } from '../../types';

/**
 * Producto con política de inventario asociada
 */
export interface ProductWithPolicy extends Product {
  /** Política de inventario asociada */
  policy?: {
    id: string;
    name: string;
    minStock?: number;
    maxStock?: number;
    reorderPoint?: number;
    daysToExpiry?: number;
  };
  /** Stock actual calculado */
  currentStock?: number;
  /** Estado de stock */
  stockStatus?: 'normal' | 'low' | 'critical' | 'excess';
  /** Días hasta caducidad (si aplica) */
  daysToExpiry?: number;
  /** Indica si el producto tiene cambio/permuta habilitado */
  hasExchange?: boolean;
}
