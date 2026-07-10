/**
 * expectedOrdersDomain.test.ts - Tests para el domain de órdenes esperadas
 */

import { describe, it, expect } from 'vitest';
import { ExpectedOrder, ExpectedItem } from '@/types';
import {
  calculateOrderStats,
  normalizeText,
  orderMatchesSearch,
  sortOrders,
  formatRelativeDate,
  validateOrder,
  OrderSortField,
  OrderSortOrder
} from './expectedOrdersDomain';

describe('expectedOrdersDomain', () => {
  // Órdenes de test
  const mockOrders: ExpectedOrder[] = [
    {
      id: 'ORD-001',
      internalId: 'INT-001',
      items: [
        { barcode: '111', name: 'Producto A', expectedQty: 10 },
        { barcode: '222', name: 'Producto B', expectedQty: 5 }
      ],
      totalExpectedUnits: 15,
      totalExpectedSKUs: 2,
      importedAt: Date.now() - 1000 // 1 segundo atrás
    },
    {
      id: 'ORD-002',
      internalId: 'INT-002',
      items: [
        { barcode: '333', name: 'Producto C', expectedQty: 20 }
      ],
      totalExpectedUnits: 20,
      totalExpectedSKUs: 1,
      importedAt: Date.now() - 24 * 60 * 60 * 1000 // 1 día atrás
    },
    {
      id: 'ORD-003',
      internalId: 'INT-003',
      items: [
        { barcode: '444', name: 'Producto D', expectedQty: 8 }
      ],
      totalExpectedUnits: 8,
      totalExpectedSKUs: 1,
      importedAt: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 días atrás
    }
  ];

  describe('normalizeText', () => {
    it('debe convertir a uppercase', () => {
      expect(normalizeText('hola')).toBe('HOLA');
    });

    it('debe remover acentos', () => {
      expect(normalizeText('café')).toBe('CAFE');
    });

    it('debe manejar valores null', () => {
      expect(normalizeText(null)).toBe('');
    });

    it('debe manejar valores undefined', () => {
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('calculateOrderStats', () => {
    it('debe calcular estadísticas correctamente', () => {
      const stats = calculateOrderStats(mockOrders);
      
      expect(stats.total).toBe(3);
      expect(stats.totalItems).toBe(4); // 2 + 1 + 1
      expect(stats.totalUnits).toBe(43); // 15 + 20 + 8
    });

    it('debe contar órdenes recientes (últimos 7 días)', () => {
      const stats = calculateOrderStats(mockOrders);
      
      // ORD-001 y ORD-002 están en los últimos 7 días
      expect(stats.recentCount).toBe(2);
    });

    it('debe manejar array vacío', () => {
      const stats = calculateOrderStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.totalItems).toBe(0);
      expect(stats.totalUnits).toBe(0);
    });
  });

  describe('orderMatchesSearch', () => {
    it('debe coincidir con ID', () => {
      expect(orderMatchesSearch(mockOrders[0], 'ORD-001')).toBe(true);
    });

    it('debe coincidir con purchaseOrder en metadata', () => {
      const order = {
        ...mockOrders[0],
        metadata: { purchaseOrder: 'PO-12345' }
      };
      expect(orderMatchesSearch(order, 'PO-12345')).toBe(true);
    });

    it('debe coincidir con barcode en items', () => {
      expect(orderMatchesSearch(mockOrders[0], '111')).toBe(true);
    });

    it('debe coincidir con nombre en items', () => {
      expect(orderMatchesSearch(mockOrders[0], 'Producto A')).toBe(true);
    });

    it('debe retornar true para búsqueda vacía', () => {
      expect(orderMatchesSearch(mockOrders[0], '')).toBe(true);
    });

    it('debe retornar false si no hay coincidencia', () => {
      expect(orderMatchesSearch(mockOrders[0], 'xyz')).toBe(false);
    });

    it('debe ser case insensitive', () => {
      expect(orderMatchesSearch(mockOrders[0], 'producto a')).toBe(true);
    });
  });

  describe('sortOrders', () => {
    it('debe ordenar por importedAt descendente', () => {
      const sorted = sortOrders(mockOrders, 'importedAt', 'desc');
      
      // Más reciente primero
      expect(sorted[0].id).toBe('ORD-001');
      expect(sorted[2].id).toBe('ORD-003');
    });

    it('debe ordenar por importedAt ascendente', () => {
      const sorted = sortOrders(mockOrders, 'importedAt', 'asc');
      
      // Más antiguo primero
      expect(sorted[0].id).toBe('ORD-003');
      expect(sorted[2].id).toBe('ORD-001');
    });

    it('debe ordenar por totalUnits descendente', () => {
      const sorted = sortOrders(mockOrders, 'totalUnits', 'desc');
      
      expect(sorted[0].totalExpectedUnits).toBe(20);
      expect(sorted[2].totalExpectedUnits).toBe(8);
    });

    it('debe ordenar por ID ascendente', () => {
      const sorted = sortOrders(mockOrders, 'id', 'asc');
      
      expect(sorted[0].id).toBe('ORD-001');
      expect(sorted[2].id).toBe('ORD-003');
    });

    it('no debe mutar el array original', () => {
      const original = [...mockOrders];
      sortOrders(mockOrders, 'importedAt', 'desc');
      
      expect(mockOrders[0].id).toBe(original[0].id);
    });
  });

  describe('formatRelativeDate', () => {
    it('debe mostrar "Hace un momento" para fechas recientes', () => {
      const result = formatRelativeDate(Date.now() - 500);
      expect(result).toBe('Hace un momento');
    });

    it('debe mostrar minutos', () => {
      const result = formatRelativeDate(Date.now() - 5 * 60 * 1000);
      expect(result).toBe('Hace 5 min');
    });

    it('debe mostrar horas', () => {
      const result = formatRelativeDate(Date.now() - 3 * 60 * 60 * 1000);
      expect(result).toBe('Hace 3 h');
    });

    it('debe mostrar "Ayer" para 1 día', () => {
      const result = formatRelativeDate(Date.now() - 24 * 60 * 60 * 1000);
      expect(result).toBe('Ayer');
    });
  });

  describe('validateOrder', () => {
    it('debe validar orden válida', () => {
      const result = validateOrder(mockOrders[0]);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe reportar error si falta ID', () => {
      const order = { ...mockOrders[0], id: '' };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El ID de orden es requerido');
    });

    it('debe reportar error si no hay items', () => {
      const order = { ...mockOrders[0], items: [] };
      const result = validateOrder(order);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La orden debe tener al menos un item');
    });

    it('debe reportar warning si cantidad es 0', () => {
      const order: ExpectedOrder = {
        ...mockOrders[0],
        items: [{ barcode: '111', name: 'Producto', expectedQty: 0 }]
      };
      const result = validateOrder(order);
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('debe reportar error si falta barcode en item', () => {
      const order: ExpectedOrder = {
        ...mockOrders[0],
        items: [{ barcode: '', name: 'Producto', expectedQty: 5 }]
      };
      const result = validateOrder(order);
      
      expect(result.errors).toContain('Item 1: barcode es requerido');
    });
  });
});
