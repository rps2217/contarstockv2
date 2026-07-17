import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExpiryActions } from './useExpiryActions';

describe('useExpiryActions', () => {
  const mockEngine = {
    activeBarcode: '123456789',
    activeProduct: { name: 'Test Product' },
    multiplier: 1,
    actions: {
      triggerFeedback: vi.fn(),
    },
  };

  const mockSaveExpiry = vi.fn().mockResolvedValue({ id: 'expiry-1' });
  const mockGetExpiryForBarcode = vi
    .fn()
    .mockResolvedValue({ id: 'expiry-1', barcode: '123456789' });
  const mockSyncExpiry = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isNoDate', () => {
    it('should return true for mm=0, yyyy=9999', () => {
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
        })
      );

      expect(result.current.isNoDate(0, 9999)).toBe(true);
    });

    it('should return false for valid dates', () => {
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
        })
      );

      expect(result.current.isNoDate(6, 2026)).toBe(false);
      expect(result.current.isNoDate(12, 2025)).toBe(false);
    });
  });

  describe('handleExpiryComplete', () => {
    it('should skip saving when date is 0/9999', async () => {
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
          saveExpiry: mockSaveExpiry,
        })
      );

      await result.current.handleExpiryComplete(0, 9999);

      expect(mockSaveExpiry).not.toHaveBeenCalled();
    });

    it('should save expiry when date is valid', async () => {
      const saveExpiry = vi.fn().mockResolvedValue({ id: 'expiry-1' });
      const getExpiryForBarcode = vi
        .fn()
        .mockResolvedValue({ id: 'expiry-1', barcode: '123456789' });
      const syncExpiry = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
          saveExpiry,
          getExpiryForBarcode,
          syncExpiry,
        })
      );

      await result.current.handleExpiryComplete(6, 2026);

      expect(saveExpiry).toHaveBeenCalledWith({
        barcode: '123456789',
        productName: 'Test Product',
        mm: 6,
        yyyy: 2026,
        quantity: 1,
        sessionId: 'test-session',
        location: 'ZONA-A',
      });
    });

    it('should use custom barcode when provided', async () => {
      const saveExpiry = vi.fn().mockResolvedValue({ id: 'expiry-1' });
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
          saveExpiry,
        })
      );

      await result.current.handleExpiryComplete(6, 2026, { barcode: 'CUSTOM-BARCODE' });

      expect(saveExpiry).toHaveBeenCalledTimes(1);
      expect(saveExpiry.mock.calls[0][0].barcode).toBe('CUSTOM-BARCODE');
    });

    it('should use custom quantity when provided', async () => {
      const saveExpiry = vi.fn().mockResolvedValue({ id: 'expiry-1' });
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
          saveExpiry,
        })
      );

      await result.current.handleExpiryComplete(6, 2026, { quantity: 5 });

      expect(saveExpiry).toHaveBeenCalledTimes(1);
      expect(saveExpiry.mock.calls[0][0].quantity).toBe(5);
    });

    it('should not call saveExpiry if not provided', async () => {
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
        })
      );

      // No debe tirar error
      await expect(result.current.handleExpiryComplete(6, 2026)).resolves.not.toThrow();
    });
  });

  describe('handleExpiryCancel', () => {
    it('should trigger error feedback', async () => {
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
        })
      );

      await result.current.handleExpiryCancel();

      expect(mockEngine.actions.triggerFeedback).toHaveBeenCalledWith('error');
    });

    it('should use custom barcode when provided', async () => {
      const { result } = renderHook(() =>
        useExpiryActions({
          sessionId: 'test-session',
          currentLocation: 'ZONA-A',
          engine: mockEngine,
        })
      );

      await result.current.handleExpiryCancel({ barcode: 'CUSTOM-BARCODE' });

      expect(mockEngine.actions.triggerFeedback).toHaveBeenCalledWith('error');
    });
  });
});
