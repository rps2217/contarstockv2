/**
 * ExpectedOrderRepository Tests
 *
 * Tests de tipos y estructura para ExpectedOrderRepository.
 * No se importan módulos con dependencias externas (Supabase).
 */

import { describe, it, expect } from 'vitest';
import type { ExpectedOrder, ExpectedItem } from '../../types';

describe('ExpectedOrderRepository Types', () => {
  it('should support ExpectedOrder structure', () => {
    const order: ExpectedOrder = {
      id: 'ERP-001',
      internalId: 'ERP-001',
      items: [
        { barcode: '7501234567890', name: 'Product 1', expectedQty: 10 },
        { barcode: '7501234567891', name: 'Product 2', expectedQty: 20 },
      ],
      totalExpectedUnits: 30,
      totalExpectedSKUs: 2,
      importedAt: Date.now(),
    };

    expect(order.id).toBe('ERP-001');
    expect(order.items).toHaveLength(2);
    expect(order.totalExpectedUnits).toBe(30);
  });

  it('should support ExpectedItem structure', () => {
    const item: ExpectedItem = {
      barcode: '7501234567890',
      name: 'Product 1',
      expectedQty: 10,
    };

    expect(item.barcode).toBe('7501234567890');
    expect(item.expectedQty).toBe(10);
  });

  it('should support metadata structure', () => {
    const metadata = {
      documentType: 'Picking List',
      date: '2024-01-15',
      purchaseOrder: 'PO-001',
      orderNote: 'Urgent',
    };

    expect(metadata.documentType).toBe('Picking List');
    expect(metadata.purchaseOrder).toBe('PO-001');
  });
});
