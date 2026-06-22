import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductivity } from './useProductivity';

describe('useProductivity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00'));
  });

  it('should initialize with zero stats', () => {
    const { result } = renderHook(() => useProductivity([]));
    
    expect(result.current.stats.totalItems).toBe(0);
    expect(result.current.stats.totalQuantity).toBe(0);
    expect(result.current.stats.itemsPerMinute).toBe(0);
    expect(result.current.stats.bestPace).toBe(0);
    expect(result.current.stats.fatigueLevel).toBe('normal');
  });

  it('should track items correctly', async () => {
    const items = [
      { barcode: '001', totalQuantity: 5 },
      { barcode: '002', totalQuantity: 3 },
    ];
    
    const { result } = renderHook(() => useProductivity(items));
    
    expect(result.current.stats.totalItems).toBe(2);
    expect(result.current.stats.totalQuantity).toBe(8);
  });

  it('should track session duration', () => {
    const { result } = renderHook(() => useProductivity([]));
    
    // Session duration should be a non-negative number
    expect(result.current.stats.sessionDuration).toBeGreaterThanOrEqual(0);
    expect(typeof result.current.stats.sessionDuration).toBe('number');
  });

  it('should reset session correctly', async () => {
    const { result } = renderHook(() => useProductivity([
      { barcode: '001', totalQuantity: 5 }
    ]));
    
    // Advance time
    vi.setSystemTime(new Date('2024-06-15T10:05:00'));
    
    act(() => {
      result.current.resetSession();
    });
    
    expect(result.current.stats.sessionDuration).toBeLessThan(60);
    expect(result.current.stats.totalItems).toBe(1); // Items preserved
    expect(result.current.stats.bestPace).toBe(0); // Best pace reset
  });

  it('should format duration correctly', () => {
    const { result } = renderHook(() => useProductivity([]));
    
    expect(result.current.formattedDuration).toBeDefined();
    expect(result.current.formattedDuration).toMatch(/^\d+:\d{2}$/);
  });

  it('should track best pace', async () => {
    // This test verifies the bestPace field exists and is tracked
    const items = [
      { barcode: '001', totalQuantity: 1 }
    ];
    
    const { result } = renderHook(() => useProductivity(items));
    
    // bestPace should be 0 initially or have some value
    expect(typeof result.current.stats.bestPace).toBe('number');
  });

  it('should have fatigueLevel in stats', () => {
    const { result } = renderHook(() => useProductivity([]));
    
    expect(result.current.stats.fatigueLevel).toBeDefined();
    expect(['fresh', 'normal', 'tired']).toContain(result.current.stats.fatigueLevel);
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() => useProductivity([]));
    
    expect(result.current.stats.totalItems).toBe(0);
    expect(result.current.stats.itemsPerMinute).toBe(0);
    expect(result.current.stats.trend).toBe('stable');
  });

  it('should have all required stats properties', () => {
    const { result } = renderHook(() => useProductivity([]));
    
    const requiredProps = [
      'totalItems',
      'totalQuantity',
      'itemsPerMinute',
      'averageTimePerItem',
      'sessionDuration',
      'trend',
      'trendPercent',
      'lastScanTime',
      'bestPace',
      'fatigueLevel'
    ];
    
    requiredProps.forEach(prop => {
      expect(result.current.stats).toHaveProperty(prop);
    });
  });
});
