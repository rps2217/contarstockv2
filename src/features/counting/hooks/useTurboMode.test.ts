/**
 * useTurboMode Tests
 * 
 * Tests para el hook de modo turbo de conteo rápido.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTurboMode } from './useTurboMode';

// Mock SoundFX
vi.mock('../../../services/audio', () => ({
  SoundFX: {
    play: vi.fn(),
  },
}));

describe('useTurboMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTurboMode());
    
    expect(result.current.isActive).toBe(false);
    expect(result.current.lastScannedBarcode).toBeNull();
    expect(result.current.lastQuantity).toBe(0);
    expect(result.current.scanCount).toBe(0);
  });

  it('should toggle turbo mode', () => {
    const { result } = renderHook(() => useTurboMode());
    
    expect(result.current.isActive).toBe(false);
    
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isActive).toBe(true);
    
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isActive).toBe(false);
  });

  it('should activate turbo mode', () => {
    const { result } = renderHook(() => useTurboMode());
    
    act(() => {
      result.current.activate();
    });
    expect(result.current.isActive).toBe(true);
  });

  it('should deactivate turbo mode', () => {
    const { result } = renderHook(() => useTurboMode());
    
    // First activate
    act(() => {
      result.current.activate();
    });
    expect(result.current.isActive).toBe(true);
    
    // Then deactivate
    act(() => {
      result.current.deactivate();
    });
    expect(result.current.isActive).toBe(false);
  });

  it('should register scan and update state', () => {
    const { result } = renderHook(() => useTurboMode());
    
    act(() => {
      result.current.registerScan('123456789', 5);
    });
    
    expect(result.current.lastScannedBarcode).toBe('123456789');
    expect(result.current.lastQuantity).toBe(5);
  });

  it('should increment scan count when active', () => {
    const { result } = renderHook(() => useTurboMode());
    
    // Activate turbo mode
    act(() => {
      result.current.activate();
    });
    
    // Register scans
    act(() => {
      result.current.registerScan('barcode1', 1);
    });
    expect(result.current.scanCount).toBe(1);
    
    act(() => {
      result.current.registerScan('barcode2', 2);
    });
    expect(result.current.scanCount).toBe(2);
  });

  it('should not increment scan count when inactive', () => {
    const { result } = renderHook(() => useTurboMode());
    
    // Turbo mode is OFF by default
    expect(result.current.isActive).toBe(false);
    
    act(() => {
      result.current.registerScan('barcode', 1);
    });
    
    expect(result.current.scanCount).toBe(0);
  });

  it('should reset scan count', () => {
    const { result } = renderHook(() => useTurboMode());
    
    // Activate and register scans
    act(() => {
      result.current.activate();
      result.current.registerScan('barcode1', 1);
      result.current.registerScan('barcode2', 2);
    });
    
    expect(result.current.scanCount).toBe(2);
    
    // Reset
    act(() => {
      result.current.resetCount();
    });
    
    expect(result.current.scanCount).toBe(0);
    expect(result.current.isActive).toBe(true); // Turbo mode still active
  });

  it('should have toggle, activate, deactivate, registerScan, resetCount functions', () => {
    const { result } = renderHook(() => useTurboMode());
    
    expect(typeof result.current.toggle).toBe('function');
    expect(typeof result.current.activate).toBe('function');
    expect(typeof result.current.deactivate).toBe('function');
    expect(typeof result.current.registerScan).toBe('function');
    expect(typeof result.current.resetCount).toBe('function');
  });
});
