import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProductsStats } from './useProductsStats';
import { Product } from '@/types';

describe('useProductsStats', () => {
  it('should return zero stats for empty products', () => {
    const { result } = renderHook(() => useProductsStats({
      products: [],
      pendingChangesCount: 0
    }));

    expect(result.current.byPolicy.total).toBe(0);
    expect(result.current.byPolicy.exchange).toBe(0);
    expect(result.current.alerts.lowStock).toBe(0);
  });

  it('should calculate stats correctly', () => {
    const products: Product[] = [
      { barcode: '1', name: 'P1', hasExchange: true, stock: 5 } as any,
      { barcode: '2', name: 'P2', hasExchange: false, stock: 15 } as any,
      { barcode: '3', name: 'P3', stock: 0 } as any,
    ];

    const { result } = renderHook(() => useProductsStats({
      products,
      pendingChangesCount: 2
    }));

    expect(result.current.byPolicy.total).toBe(3);
    expect(result.current.byPolicy.exchange).toBe(1);
    expect(result.current.byPolicy.loss).toBe(1);
    expect(result.current.byPolicy.noInfo).toBe(1);
    expect(result.current.alerts.pendingChanges).toBe(2);
  });

  it('should track stock alerts', () => {
    const products: Product[] = [
      { barcode: '1', name: 'P1', stock: 0 } as any,  // CRITICAL
      { barcode: '2', name: 'P2', stock: 3, minStock: 10 } as any,  // LOW
      { barcode: '3', name: 'P3', stock: 15 } as any,  // NORMAL
    ];

    const { result } = renderHook(() => useProductsStats({
      products,
      pendingChangesCount: 0
    }));

    expect(result.current.alerts.lowStock).toBeGreaterThanOrEqual(2);
  });

  it('should include sync alerts', () => {
    const products: Product[] = [
      { barcode: '1', name: 'P1', syncStatus: 'pending' } as any,
      { barcode: '2', name: 'P2', syncStatus: 'synced' } as any,
    ];

    const { result } = renderHook(() => useProductsStats({
      products,
      pendingChangesCount: 0
    }));

    expect(result.current.alerts.syncing).toBe(1);
  });

  it('should handle missing policy info', () => {
    const products: Product[] = [
      { barcode: '1', name: 'P1' } as any,
      { barcode: '2', name: 'P2', hasExchange: true } as any,
    ];

    const { result } = renderHook(() => useProductsStats({
      products,
      pendingChangesCount: 0
    }));

    expect(result.current.byPolicy.noInfo).toBe(1);
    expect(result.current.alerts.missingPolicy).toBe(1);
  });

  it('should have all required return properties', () => {
    const { result } = renderHook(() => useProductsStats({
      products: [],
      pendingChangesCount: 0
    }));

    expect(result.current).toHaveProperty('stats');
    expect(result.current).toHaveProperty('byPolicy');
    expect(result.current).toHaveProperty('byStock');
    expect(result.current).toHaveProperty('alerts');

    // Check byPolicy
    expect(result.current.byPolicy).toHaveProperty('exchange');
    expect(result.current.byPolicy).toHaveProperty('loss');
    expect(result.current.byPolicy).toHaveProperty('noInfo');
    expect(result.current.byPolicy).toHaveProperty('total');

    // Check byStock
    expect(result.current.byStock).toHaveProperty('normal');
    expect(result.current.byStock).toHaveProperty('low');
    expect(result.current.byStock).toHaveProperty('critical');
    expect(result.current.byStock).toHaveProperty('excess');

    // Check alerts
    expect(result.current.alerts).toHaveProperty('lowStock');
    expect(result.current.alerts).toHaveProperty('missingPolicy');
    expect(result.current.alerts).toHaveProperty('syncing');
    expect(result.current.alerts).toHaveProperty('pendingChanges');
  });
});
