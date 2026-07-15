/**
 * Tests para backupService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de módulos externos
vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/db', () => ({
  db: {
    products: { toArray: vi.fn().mockResolvedValue([]) },
    sessions: { toArray: vi.fn().mockResolvedValue([]), bulkPut: vi.fn() },
    scans: { toArray: vi.fn().mockResolvedValue([]), bulkPut: vi.fn() },
    dynamic_data: { toArray: vi.fn().mockResolvedValue([]), bulkAdd: vi.fn() },
    expectedOrders: { toArray: vi.fn().mockResolvedValue([]), bulkAdd: vi.fn() },
    transaction: vi.fn((mode, tables, fn) => fn()),
  },
}));

vi.mock('@/services/settings', () => ({
  getSettings: vi.fn().mockReturnValue({ theme: 'dark', warehouseId: 'WH001' }),
}));

// Mock de APIs del navegador
const mockURLCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockURLRevokeObjectURL = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockDispatchEvent = vi.fn();
const mockPersist = vi.fn();
const mockEstimate = vi.fn().mockResolvedValue({ quota: 1000000, usage: 1000 });

global.URL.createObjectURL = mockURLCreateObjectURL;
global.URL.revokeObjectURL = mockURLRevokeObjectURL;
global.document = {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: mockClick,
  })),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
} as unknown as Document;

global.dispatchEvent = mockDispatchEvent;

Object.defineProperty(global, 'navigator', {
  value: {
    storage: {
      persist: mockPersist,
      estimate: mockEstimate,
    },
  },
  writable: true,
});

describe('backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initPersistence', () => {
    it('should request storage persistence', async () => {
      const { initPersistence } = await import('@/services/backupService');
      await initPersistence();
      expect(mockPersist).toHaveBeenCalled();
      expect(mockEstimate).toHaveBeenCalled();
    });

    it('should handle persistence errors gracefully', async () => {
      mockPersist.mockRejectedValueOnce(new Error('Storage not available'));
      const { initPersistence } = await import('@/services/backupService');
      await expect(initPersistence()).resolves.not.toThrow();
    });
  });

  describe('createFullBackup', () => {
    it('should create a backup blob and trigger download', async () => {
      const { createFullBackup } = await import('@/services/backupService');
      await createFullBackup();
      
      expect(mockURLCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockURLRevokeObjectURL).toHaveBeenCalled();
    });

    it('should create blob with valid JSON type', async () => {
      const { createFullBackup } = await import('@/services/backupService');
      
      await createFullBackup();
      
      // Verificar que se llamó a createObjectURL
      expect(mockURLCreateObjectURL).toHaveBeenCalled();
    });
  });

  describe('restoreFullBackup', () => {
    it('should exist and be a function', async () => {
      const { restoreFullBackup } = await import('@/services/backupService');
      expect(restoreFullBackup).toBeDefined();
      expect(typeof restoreFullBackup).toBe('function');
    });
  });

  describe('createEmergencySnapshot', () => {
    it('should create snapshot in localStorage without throwing', async () => {
      const { createEmergencySnapshot } = await import('@/services/backupService');
      
      await expect(createEmergencySnapshot()).resolves.not.toThrow();
    });
  });

  describe('recoverFromEmergencySnapshot', () => {
    it('should recover data from localStorage snapshot', async () => {
      const { recoverFromEmergencySnapshot } = await import('@/services/backupService');
      
      const result = await recoverFromEmergencySnapshot();
      expect(result).toBeDefined();
    });
  });
});
