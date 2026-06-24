/**
 * expectedOrdersDomain.ts - Lógica de negocio pura para el módulo de Órdenes Esperadas
 * 
 * Principios:
 * - Sin dependencias de React hooks
 * - Sin estado global
 * - Funciones puras y tipadas
 */

import { ExpectedOrder, ExpectedItem } from '@/types';

/**
 * Tipos de documento
 */
export enum DocumentType {
  PICKING_LIST = 'Picking List',
  MANIFEST = 'Manifest',
  INVOICE = 'Invoice',
  ORDER = 'Order'
}

/**
 * Estados de orden
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Configuración de estados para UI
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  bg: string;
  text: string;
}> = {
  [OrderStatus.PENDING]: {
    label: 'Pendiente',
    color: 'bg-slate-500',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400'
  },
  [OrderStatus.IN_PROGRESS]: {
    label: 'En Proceso',
    color: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400'
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completada',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400'
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelada',
    color: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400'
  }
};

/**
 * Estadísticas de órdenes
 */
export interface OrderStats {
  total: number;
  totalItems: number;
  totalUnits: number;
  byStatus: Record<OrderStatus, number>;
  recentCount: number;
}

/**
 * Calcula estadísticas de órdenes
 */
export const calculateOrderStats = (orders: ExpectedOrder[]): OrderStats => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const stats: OrderStats = {
    total: orders.length,
    totalItems: 0,
    totalUnits: 0,
    byStatus: {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.IN_PROGRESS]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0
    },
    recentCount: 0
  };

  for (const order of orders) {
    stats.totalItems += order.totalExpectedSKUs || 0;
    stats.totalUnits += order.totalExpectedUnits || 0;
    
    if (order.importedAt && order.importedAt > sevenDaysAgo) {
      stats.recentCount++;
    }
  }

  return stats;
};

/**
 * Normaliza texto para búsqueda
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Verifica si una orden coincide con la búsqueda
 */
export const orderMatchesSearch = (
  order: ExpectedOrder,
  query: string
): boolean => {
  if (!query.trim()) return true;
  
  const normalizedQuery = normalizeText(query);
  
  if (normalizeText(order.id).includes(normalizedQuery)) return true;
  
  if (order.metadata?.purchaseOrder && 
      normalizeText(order.metadata.purchaseOrder).includes(normalizedQuery)) {
    return true;
  }
  
  for (const item of order.items || []) {
    if (normalizeText(item.barcode).includes(normalizedQuery)) return true;
    if (normalizeText(item.name).includes(normalizedQuery)) return true;
  }
  
  return false;
};

/**
 * Ordena órdenes por criterio
 */
export type OrderSortField = 'id' | 'importedAt' | 'totalUnits';
export type OrderSortOrder = 'asc' | 'desc';

export const sortOrders = (
  orders: ExpectedOrder[],
  field: OrderSortField = 'importedAt',
  order: OrderSortOrder = 'desc'
): ExpectedOrder[] => {
  const sorted = [...orders].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'id':
        comparison = (a.id || '').localeCompare(b.id || '');
        break;
      case 'importedAt':
        comparison = (a.importedAt || 0) - (b.importedAt || 0);
        break;
      case 'totalUnits':
        comparison = (a.totalExpectedUnits || 0) - (b.totalExpectedUnits || 0);
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};

/**
 * Formatea fecha relativa
 */
export const formatRelativeDate = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  
  return new Date(timestamp).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Valida items de una orden
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateOrder = (order: ExpectedOrder): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!order.id || order.id.trim() === '') {
    errors.push('El ID de orden es requerido');
  }
  
  if (!order.items || order.items.length === 0) {
    errors.push('La orden debe tener al menos un item');
  } else {
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      
      if (!item.barcode || item.barcode.trim() === '') {
        errors.push(`Item ${i + 1}: barcode es requerido`);
      }
      
      if (!item.expectedQty || item.expectedQty <= 0) {
        warnings.push(`Item ${i + 1}: cantidad debe ser mayor a 0`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
