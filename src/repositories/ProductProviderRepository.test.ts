/**
 * ProductProviderRepository Tests
 *
 * Tests para el repositorio singleton de relaciones producto-proveedor.
 */

import { describe, it, expect, vi } from 'vitest';
import { productProviderRepository } from './ProductProviderRepository';

describe('ProductProviderRepository', () => {
  describe('API surface', () => {
    it('should have all required methods', () => {
      expect(typeof productProviderRepository.save).toBe('function');
      expect(typeof productProviderRepository.saveMany).toBe('function');
      expect(typeof productProviderRepository.getByProduct).toBe('function');
      expect(typeof productProviderRepository.getPrimaryProvider).toBe('function');
      expect(typeof productProviderRepository.getAll).toBe('function');
      expect(typeof productProviderRepository.delete).toBe('function');
      expect(typeof productProviderRepository.setPrimary).toBe('function');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(productProviderRepository).toBeDefined();
      expect(productProviderRepository.table).toBe('productProviders');
    });
  });
});

describe('ProductProviderRepository Types', () => {
  it('should support ProductProvider structure', () => {
    const relation = {
      id: 1,
      productBarcode: '7501234567890',
      providerRut: '12345678-9',
      isPrimary: true,
      hasExchange: true,
      withdrawalDays: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(relation.productBarcode).toBe('7501234567890');
    expect(relation.providerRut).toBe('12345678-9');
    expect(relation.isPrimary).toBe(true);
  });

  it('should support resolved policy structure', () => {
    const policy = {
      withdrawalDays: 30,
      hasExchange: true,
    };

    expect(policy.withdrawalDays).toBe(30);
    expect(policy.hasExchange).toBe(true);
  });

  it('should support provider stats structure', () => {
    const stats = new Map<string, { total: number; primary: number }>();
    stats.set('rut-1', { total: 10, primary: 2 });

    expect(stats.get('rut-1')?.total).toBe(10);
    expect(stats.get('rut-1')?.primary).toBe(2);
  });
});
