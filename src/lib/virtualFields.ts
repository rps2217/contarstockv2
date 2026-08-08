'use client';
/**
 * Virtual Fields - Campos Calculados Dinámicos
 *
 * Inspirado en AppSheet Virtual Columns.
 * Permite definir campos calculados que no se almacenan en BD
 * sino que se calculan en tiempo real.
 *
 * Uso:
 * const computed = computeVirtualFields(product, fieldDefinitions);
 */

import { Product } from '@/types';

// =============================================================================
// TIPOS
// =============================================================================

export type VirtualFieldType = 'number' | 'string' | 'boolean' | 'date' | 'badge';

/**
 * Definición de un campo virtual
 */
export interface VirtualFieldDefinition<T = any> {
  /** Nombre único del campo */
  name: string;
  /** Etiqueta visible para el usuario */
  label: string;
  /** Tipo de dato del campo calculado */
  type: VirtualFieldType;
  /** Función que calcula el valor */
  compute: (record: T, context?: ComputeContext) => any;
  /** Color/estilo para badges */
  badgeStyle?: BadgeStyle;
  /** Orden de prioridad (menor = primero) */
  priority?: number;
}

/**
 * Contexto para el cálculo de campos virtuales
 */
export interface ComputeContext {
  /** Día actual (para comparaciones) */
  today?: Date;
  /** Moneda local */
  currency?: string;
  /** Zona horaria */
  timezone?: string;
  /** Usuario actual */
  userId?: string;
  /** Almacén/ubicación actual */
  warehouse?: string;
  /** Configuraciones adicionales */
  config?: Record<string, any>;
}

/**
 * Estilos para badges
 */
export type BadgeStyle =
  | 'success' // Verde - OK
  | 'warning' // Amarillo - Atención
  | 'error' // Rojo - Crítico
  | 'info' // Azul - Informativo
  | 'neutral'; // Gris - Normal

/**
 * Campo virtual calculado
 */
export interface ComputedField {
  name: string;
  label: string;
  value: unknown;
  type: VirtualFieldType;
  badgeStyle?: BadgeStyle;
  formatted?: string;
}

// =============================================================================
// DEFINICIONES DE CAMPOS VIRTUALES
// =============================================================================

/**
 * Campos virtuales para productos
 */
export const PRODUCT_VIRTUAL_FIELDS: VirtualFieldDefinition<Product>[] = [
  // Stock Status Badge
  {
    name: 'stockStatus',
    label: 'Estado Stock',
    type: 'badge',
    priority: 1,
    badgeStyle: 'neutral',
    compute: product => {
      if (!product.stock && product.stock !== 0) return 'unknown';
      if (product.stock <= 0) return 'critical';
      if (product.minStock && product.stock < product.minStock) return 'warning';
      return 'ok';
    },
  },

  // Stock percentage
  {
    name: 'stockPercentage',
    label: '% Stock',
    type: 'number',
    priority: 2,
    compute: product => {
      if (!product.minStock || product.minStock === 0) return null;
      if (!product.stock) return 0;
      return Math.round((product.stock / product.minStock) * 100);
    },
  },

  // Days until expiry (para tracking de vencimientos)
  {
    name: 'daysUntilExpiry',
    label: 'Días para vencer',
    type: 'number',
    priority: 3,
    compute: (product, context) => {
      const expiryDate = (product as unknown as Record<string, unknown>).expiryDate;
      if (!expiryDate) return null;
      const today = context?.today || new Date();
      const expiry = new Date(expiryDate as string);
      const diff = expiry.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },
  },

  // Expiry status badge
  {
    name: 'expiryStatus',
    label: 'Vencimiento',
    type: 'badge',
    priority: 4,
    badgeStyle: 'neutral',
    compute: (product, context) => {
      const days = PRODUCT_VIRTUAL_FIELDS[2].compute(product, context) as number;
      if (days === null) return 'none';
      if (days < 0) return 'expired';
      if (days <= 30) return 'critical';
      if (days <= 90) return 'warning';
      return 'ok';
    },
  },

  // Stock value
  {
    name: 'stockValue',
    label: 'Valor Stock',
    type: 'number',
    priority: 5,
    compute: product => {
      if (!product.stock || !product.price) return 0;
      return product.stock * product.price;
    },
  },

  // Price with currency
  {
    name: 'formattedPrice',
    label: 'Precio',
    type: 'string',
    priority: 6,
    compute: (product, context) => {
      if (!product.price) return '-';
      const currency = context?.config?.currency || 'CLP';
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
      }).format(product.price);
    },
  },

  // Critical stock indicator
  {
    name: 'isCriticalStock',
    label: 'Stock Crítico',
    type: 'boolean',
    priority: 7,
    compute: product => {
      return product.stock !== undefined && product.stock <= (product.minStock || 0) / 2;
    },
  },

  // Location badge
  {
    name: 'locationBadge',
    label: 'Ubicación',
    type: 'badge',
    priority: 8,
    compute: product => {
      if (!product.location) return 'none';
      return 'info';
    },
  },

  // Need reorder
  {
    name: 'needsReorder',
    label: '¿Reponer?',
    type: 'boolean',
    priority: 9,
    compute: product => {
      if (product.stock === undefined || !product.minStock) return false;
      return product.stock <= product.minStock;
    },
  },

  // Full name (category + name)
  {
    name: 'fullName',
    label: 'Nombre Completo',
    type: 'string',
    priority: 10,
    compute: product => {
      if (product.category) {
        return `${product.category} - ${product.name}`;
      }
      return product.name;
    },
  },
];

// =============================================================================
// FUNCIONES DE CÁLCULO
// =============================================================================

/**
 * Calcula todos los campos virtuales para un registro
 */
export function computeVirtualFields<T extends Record<string, any>>(
  record: T,
  definitions: VirtualFieldDefinition<T>[],
  context?: ComputeContext
): Record<string, ComputedField> {
  const result: Record<string, ComputedField> = {};

  for (const def of definitions) {
    const value = def.compute(record, context);

    result[def.name] = {
      name: def.name,
      label: def.label,
      value,
      type: def.type,
      badgeStyle: def.badgeStyle,
      formatted: formatComputedValue(value, def.type, context),
    };
  }

  return result;
}

/**
 * Formatea el valor calculado según el tipo
 */
function formatComputedValue(value: any, type: VirtualFieldType, context?: ComputeContext): string {
  if (value === null || value === undefined) return '-';

  switch (type) {
    case 'number':
      return typeof value === 'number'
        ? new Intl.NumberFormat('es-CL').format(value)
        : String(value);

    case 'boolean':
      return value ? 'Sí' : 'No';

    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('es-CL');
      }
      return String(value);

    case 'badge':
      return String(value);

    case 'string':
    default:
      return String(value);
  }
}

/**
 * Obtiene solo los campos que cumplen una condición
 */
export function computeFilteredFields<T extends Record<string, any>>(
  record: T,
  definitions: VirtualFieldDefinition<T>[],
  filter: (def: VirtualFieldDefinition<T>) => boolean,
  context?: ComputeContext
): Record<string, ComputedField> {
  const filtered = definitions.filter(filter);
  return computeVirtualFields(record, filtered, context);
}

/**
 * Obtiene métricas agregadas de campos virtuales
 */
export function computeProductMetrics(
  products: Product[],
  context?: ComputeContext
): ProductMetrics {
  const totalProducts = products.length;
  const criticalStock = products.filter(
    p => p.stock !== undefined && p.stock <= (p.minStock || 0) / 2
  ).length;

  const lowStock = products.filter(
    p => p.stock !== undefined && p.minStock && p.stock < p.minStock
  ).length;

  const outOfStock = products.filter(p => p.stock !== undefined && p.stock <= 0).length;

  const totalValue = products.reduce((sum, p) => {
    if (p.stock && p.price) {
      return sum + p.stock * p.price;
    }
    return sum;
  }, 0);

  return {
    totalProducts,
    criticalStock,
    lowStock,
    outOfStock,
    totalValue,
    criticalPercentage: totalProducts > 0 ? Math.round((criticalStock / totalProducts) * 100) : 0,
  };
}

/**
 * Métricas agregadas de productos
 */
export interface ProductMetrics {
  totalProducts: number;
  criticalStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  criticalPercentage: number;
}

// =============================================================================
// HOOK PARA REACT
// =============================================================================

import { useMemo } from 'react';

/**
 * Hook para calcular campos virtuales de un producto
 */
export function useVirtualFields<T extends Record<string, any>>(
  record: T | undefined,
  definitions: VirtualFieldDefinition<T>[],
  context?: ComputeContext
) {
  return useMemo(() => {
    if (!record) return {};
    return computeVirtualFields(record, definitions, context);
  }, [record, definitions, context]);
}

/**
 * Hook para calcular métricas de productos
 */
export function useProductMetrics(products: Product[] | undefined, context?: ComputeContext) {
  return useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalProducts: 0,
        criticalStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        criticalPercentage: 0,
      };
    }
    return computeProductMetrics(products, context);
  }, [products, context]);
}

/**
 * Hook para filtrar productos por estado de stock
 */
export function useProductStatusFilter(products: Product[] | undefined) {
  return useMemo(() => {
    if (!products) return { ok: [], warning: [], critical: [], outOfStock: [] };

    return {
      ok: products.filter(p => p.stock !== undefined && p.minStock && p.stock >= p.minStock),
      warning: products.filter(
        p => p.stock !== undefined && p.minStock && p.stock < p.minStock && p.stock > p.minStock / 2
      ),
      critical: products.filter(
        p => p.stock !== undefined && p.minStock && p.stock <= p.minStock / 2
      ),
      outOfStock: products.filter(p => p.stock !== undefined && p.stock <= 0),
    };
  }, [products]);
}
