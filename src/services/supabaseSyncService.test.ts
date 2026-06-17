/**
 * Tests para SupabaseSyncService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => () => {}),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('SupabaseSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatError', () => {
    it('should return "Error desconocido" for null/undefined', async () => {
      const { supabaseSyncService } = await import('./supabaseSyncService');
      expect(supabaseSyncService.formatError(null)).toBe('Error desconocido');
      expect(supabaseSyncService.formatError(undefined)).toBe('Error desconocido');
    });

    it('should extract message from Error objects', async () => {
      const { supabaseSyncService } = await import('./supabaseSyncService');
      const error = new Error('Test error message');
      expect(supabaseSyncService.formatError(error)).toBe('Test error message');
    });

    it('should handle string errors', async () => {
      const { supabaseSyncService } = await import('./supabaseSyncService');
      expect(supabaseSyncService.formatError('Simple error string')).toBe('Simple error string');
    });
  });

  describe('startSync', () => {
    it('should return cleanup function when offline', async () => {
      // Mock navigator.onLine = false
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { supabaseSyncService } = await import('./supabaseSyncService');
      const cleanup = supabaseSyncService.startSync('test_table', {});
      expect(cleanup).toBeInstanceOf(Function);

      // Restore
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });
  });
});
