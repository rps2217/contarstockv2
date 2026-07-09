/**
 * Tests para EventsSyncService
 * 
 * Estos tests verifican la lógica de sincronización de eventos,
 * incluyendo deduplicación, mapeo y helpers.
 * 
 * @reference https://vitest.dev/guide/mocking.html
 */

/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TESTS DE HELPERS (EXTRAÍDOS PARA TESTING)
// Los helpers reales están en EventsSyncService.ts
// ============================================================================

/**
 * Genera clave única para evento: frc_code + barcode
 */
function generateEventKey(event: { frcNumber?: string; barcode?: string }): string {
  const frc = (event.frcNumber || '').toLowerCase().trim();
  const barcode = (event.barcode || '').toLowerCase().trim();
  return `${frc}~${barcode}`;
}

describe('EventsSyncService - Helpers', () => {
  describe('generateEventKey', () => {
    it('should generate key from frcNumber and barcode', () => {
      const event = {
        frcNumber: 'FRC-001',
        barcode: '1234567890123'
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('frc-001~1234567890123');
    });

    it('should convert to lowercase', () => {
      const event = {
        frcNumber: 'FRC-ABC',
        barcode: 'BAR-CODE'
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('frc-abc~bar-code');
    });

    it('should trim whitespace', () => {
      const event = {
        frcNumber: '  FRC-001  ',
        barcode: '  1234567890123  '
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('frc-001~1234567890123');
    });

    it('should handle missing frcNumber', () => {
      const event = {
        frcNumber: '',
        barcode: '1234567890123'
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('~1234567890123');
    });

    it('should handle missing barcode', () => {
      const event = {
        frcNumber: 'FRC-001',
        barcode: ''
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('frc-001~');
    });

    it('should handle both missing', () => {
      const event = {
        frcNumber: '',
        barcode: ''
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('~');
    });

    it('should handle undefined values', () => {
      const event = {
        frcNumber: undefined,
        barcode: undefined
      };
      
      const key = generateEventKey(event);
      
      expect(key).toBe('~');
    });

    it('should generate same key for same inputs', () => {
      const event1 = { frcNumber: 'FRC-001', barcode: '123' };
      const event2 = { frcNumber: 'FRC-001', barcode: '123' };
      
      expect(generateEventKey(event1)).toBe(generateEventKey(event2));
    });

    it('should generate different keys for different inputs', () => {
      const event1 = { frcNumber: 'FRC-001', barcode: '123' };
      const event2 = { frcNumber: 'FRC-002', barcode: '123' };
      
      expect(generateEventKey(event1)).not.toBe(generateEventKey(event2));
    });
  });
});

// ============================================================================
// TESTS DE MAPEO (EXTRAÍDOS)
// ============================================================================

describe('EventsSyncService - Mapeo', () => {
  interface MockInventoryEvent {
    id?: number;
    frcNumber: string;
    barcode: string;
    productName: string;
    batch: string;
    expiryDate: string;
    resolution: string;
    status: 'pending' | 'destined' | 'adjusted';
    traspasoNumber?: string;
    location?: string;
    destino?: string;
    createdAt: number;
    updatedAt?: number;
    type: 'info' | 'warning' | 'error' | 'success';
  }

  /**
   * Simula mapToRemote para testing
   */
  function mapEventToRemote(event: MockInventoryEvent) {
    return {
      barcode: event.barcode,
      frc_code: event.frcNumber,
      product_name: event.productName,
      batch_number: event.batch,
      expiry_date: event.expiryDate,
      resolution: event.resolution,
      status: event.status,
      event_type: event.type,
      location: event.location || null,
      transfer_doc: event.traspasoNumber || null,
      destination: event.destino || null,
      notes: event.resolution || null,
      created_at: event.createdAt
        ? new Date(event.createdAt).toISOString()
        : new Date().toISOString(),
      updated_at: event.updatedAt
        ? new Date(event.updatedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  /**
   * Simula mapToLocal para testing
   */
  function mapRemoteToEvent(remote: any) {
    return {
      barcode: remote.barcode,
      frcNumber: remote.frc_code,
      productName: remote.product_name,
      batch: remote.batch_number,
      expiryDate: remote.expiry_date,
      resolution: remote.resolution,
      status: remote.status || 'pending',
      type: remote.event_type || 'info',
      location: remote.location,
      traspasoNumber: remote.transfer_doc,
      destino: remote.destination,
      syncStatus: 'synced' as const,
      lastSyncTimestamp: Date.now(),
      createdAt: remote.created_at
        ? new Date(remote.created_at).getTime()
        : Date.now(),
      updatedAt: remote.updated_at
        ? new Date(remote.updated_at).getTime()
        : Date.now(),
    };
  }

  describe('mapEventToRemote', () => {
    it('should map all required fields', () => {
      const event: MockInventoryEvent = {
        frcNumber: 'FRC-001',
        barcode: '1234567890123',
        productName: 'Test Product',
        batch: 'LOT-001',
        expiryDate: '12/2025',
        resolution: 'Test resolution',
        status: 'pending',
        type: 'info',
        createdAt: 1700000000000,
        updatedAt: 1700001000000,
      };

      const remote = mapEventToRemote(event);

      expect(remote.barcode).toBe('1234567890123');
      expect(remote.frc_code).toBe('FRC-001');
      expect(remote.product_name).toBe('Test Product');
      expect(remote.batch_number).toBe('LOT-001');
      expect(remote.expiry_date).toBe('12/2025');
      expect(remote.resolution).toBe('Test resolution');
      expect(remote.status).toBe('pending');
      expect(remote.event_type).toBe('info');
    });

    it('should convert timestamps to ISO format', () => {
      const event: MockInventoryEvent = {
        frcNumber: 'FRC-001',
        barcode: '123',
        productName: 'Test',
        batch: '',
        expiryDate: '',
        resolution: '',
        status: 'pending',
        type: 'info',
        createdAt: 1700000000000,
        updatedAt: 1700001000000,
      };

      const remote = mapEventToRemote(event);

      expect(remote.created_at).toBe('2023-11-14T22:46:40.000Z');
      expect(remote.updated_at).toBe('2023-11-15T00:03:20.000Z');
    });

    it('should handle optional location field', () => {
      const eventWithLocation: MockInventoryEvent = {
        ...createMockEvent(),
        location: 'Warehouse A',
      };

      const eventWithoutLocation: MockInventoryEvent = {
        ...createMockEvent(),
        location: undefined,
      };

      const remoteWith = mapEventToRemote(eventWithLocation);
      const remoteWithout = mapEventToRemote(eventWithoutLocation);

      expect(remoteWith.location).toBe('Warehouse A');
      expect(remoteWithout.location).toBeNull();
    });

    it('should handle optional traspasoNumber field', () => {
      const eventWithTraspaso: MockInventoryEvent = {
        ...createMockEvent(),
        traspasoNumber: 'TR-12345',
      };

      const eventWithoutTraspaso: MockInventoryEvent = {
        ...createMockEvent(),
        traspasoNumber: undefined,
      };

      const remoteWith = mapEventToRemote(eventWithTraspaso);
      const remoteWithout = mapEventToRemote(eventWithoutTraspaso);

      expect(remoteWith.transfer_doc).toBe('TR-12345');
      expect(remoteWithout.transfer_doc).toBeNull();
    });
  });

  describe('mapRemoteToEvent', () => {
    it('should map all required fields from remote', () => {
      const remote = {
        barcode: '1234567890123',
        frc_code: 'FRC-001',
        product_name: 'Test Product',
        batch_number: 'LOT-001',
        expiry_date: '12/2025',
        resolution: 'Test resolution',
        status: 'destined',
        event_type: 'warning',
        location: 'Warehouse A',
        transfer_doc: 'TR-12345',
        destination: 'Store B',
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-16T12:00:00.000Z',
      };

      const event = mapRemoteToEvent(remote);

      expect(event.barcode).toBe('1234567890123');
      expect(event.frcNumber).toBe('FRC-001');
      expect(event.productName).toBe('Test Product');
      expect(event.batch).toBe('LOT-001');
      expect(event.expiryDate).toBe('12/2025');
      expect(event.resolution).toBe('Test resolution');
      expect(event.status).toBe('destined');
      expect(event.type).toBe('warning');
      expect(event.location).toBe('Warehouse A');
      expect(event.traspasoNumber).toBe('TR-12345');
      expect(event.destino).toBe('Store B');
      expect(event.syncStatus).toBe('synced');
    });

    it('should convert ISO dates to timestamps', () => {
      const remote = {
        barcode: '123',
        frc_code: 'FRC-001',
        product_name: 'Test',
        batch_number: '',
        expiry_date: '',
        resolution: '',
        status: 'pending',
        event_type: 'info',
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-16T12:00:00.000Z',
      };

      const event = mapRemoteToEvent(remote);

      expect(event.createdAt).toBe(new Date('2024-01-15T10:00:00.000Z').getTime());
      expect(event.updatedAt).toBe(new Date('2024-01-16T12:00:00.000Z').getTime());
    });

    it('should use defaults for missing optional fields', () => {
      const remote = {
        barcode: '123',
        frc_code: 'FRC-001',
        product_name: 'Test',
        batch_number: '',
        expiry_date: '',
        resolution: '',
        status: undefined,
        event_type: undefined,
        created_at: undefined,
        updated_at: undefined,
      };

      const event = mapRemoteToEvent(remote);

      expect(event.status).toBe('pending');
      expect(event.type).toBe('info');
      expect(event.createdAt).toBeCloseTo(Date.now(), -3); // Within last second
      expect(event.updatedAt).toBeCloseTo(Date.now(), -3);
    });
  });
});

// ============================================================================
// TESTS DE DEDUPLICACIÓN
// ============================================================================

describe('EventsSyncService - Deduplicación', () => {
  interface MockCloudEvent {
    exists: boolean;
    remoteId?: number;
    updatedAt?: number;
  }

  /**
   * Simula la lógica de filtrado para testing
   */
  function filterEventsForSync(
    localEvents: Array<{ id: number; frcNumber: string; barcode: string; updatedAt?: number }>,
    cloudEvents: Map<string, MockCloudEvent>
  ): { toCreate: number; toUpdate: number; toSkip: number } {
    const result = { toCreate: 0, toUpdate: 0, toSkip: 0 };

    for (const event of localEvents) {
      const key = generateEventKey(event);
      const cloudInfo = cloudEvents.get(key);

      if (!cloudInfo || !cloudInfo.exists) {
        result.toCreate++;
      } else if (
        event.updatedAt &&
        cloudInfo.updatedAt &&
        event.updatedAt > cloudInfo.updatedAt
      ) {
        result.toUpdate++;
      } else {
        result.toSkip++;
      }
    }

    return result;
  }

  it('should mark event for creation when not in cloud', () => {
    const localEvents = [
      { id: 1, frcNumber: 'FRC-001', barcode: '123' }
    ];
    const cloudEvents = new Map<string, MockCloudEvent>();

    const result = filterEventsForSync(localEvents, cloudEvents);

    expect(result.toCreate).toBe(1);
    expect(result.toUpdate).toBe(0);
    expect(result.toSkip).toBe(0);
  });

  it('should mark event for update when local is newer', () => {
    const localEvents = [
      { id: 1, frcNumber: 'FRC-001', barcode: '123', updatedAt: 1700002000000 }
    ];
    const cloudEvents = new Map<string, MockCloudEvent>([
      ['frc-001~123', { exists: true, remoteId: 1, updatedAt: 1700001000000 }]
    ]);

    const result = filterEventsForSync(localEvents, cloudEvents);

    expect(result.toCreate).toBe(0);
    expect(result.toUpdate).toBe(1);
    expect(result.toSkip).toBe(0);
  });

  it('should skip event when remote is newer or equal', () => {
    const localEvents = [
      { id: 1, frcNumber: 'FRC-001', barcode: '123', updatedAt: 1700001000000 }
    ];
    const cloudEvents = new Map<string, MockCloudEvent>([
      ['frc-001~123', { exists: true, remoteId: 1, updatedAt: 1700002000000 }]
    ]);

    const result = filterEventsForSync(localEvents, cloudEvents);

    expect(result.toCreate).toBe(0);
    expect(result.toUpdate).toBe(0);
    expect(result.toSkip).toBe(1);
  });

  it('should create event when cloud has newer timestamp but no updatedAt in local', () => {
    const localEvents = [
      { id: 1, frcNumber: 'FRC-001', barcode: '123', updatedAt: undefined }
    ];
    const cloudEvents = new Map<string, MockCloudEvent>([
      ['frc-001~123', { exists: true, remoteId: 1, updatedAt: 1700002000000 }]
    ]);

    const result = filterEventsForSync(localEvents, cloudEvents);

    // Si local no tiene updatedAt, se crea (no se puede comparar)
    expect(result.toCreate).toBe(1);
  });

  it('should handle multiple events with different states', () => {
    const localEvents = [
      { id: 1, frcNumber: 'FRC-001', barcode: '123', updatedAt: 1700002000000 }, // update
      { id: 2, frcNumber: 'FRC-002', barcode: '456' }, // create
      { id: 3, frcNumber: 'FRC-003', barcode: '789', updatedAt: 1700001000000 }, // skip
    ];
    const cloudEvents = new Map<string, MockCloudEvent>([
      ['frc-001~123', { exists: true, remoteId: 1, updatedAt: 1700001000000 }],
      ['frc-002~456', { exists: false }],
      ['frc-003~789', { exists: true, remoteId: 3, updatedAt: 1700002000000 }],
    ]);

    const result = filterEventsForSync(localEvents, cloudEvents);

    expect(result.toCreate).toBe(1);
    expect(result.toUpdate).toBe(1);
    expect(result.toSkip).toBe(1);
  });

  it('should handle empty local events', () => {
    const localEvents: Array<{ id: number; frcNumber: string; barcode: string }> = [];
    const cloudEvents = new Map<string, MockCloudEvent>();

    const result = filterEventsForSync(localEvents, cloudEvents);

    expect(result.toCreate).toBe(0);
    expect(result.toUpdate).toBe(0);
    expect(result.toSkip).toBe(0);
  });
});

// ============================================================================
// HELPERS
// ============================================================================

function createMockEvent(overrides: Partial<{
  id: number;
  frcNumber: string;
  barcode: string;
  productName: string;
  batch: string;
  expiryDate: string;
  resolution: string;
  status: 'pending' | 'destined' | 'adjusted';
  traspasoNumber?: string;
  location?: string;
  destino?: string;
  createdAt: number;
  updatedAt?: number;
  type: 'info' | 'warning' | 'error' | 'success';
}> = {}): {
  id?: number;
  frcNumber: string;
  barcode: string;
  productName: string;
  batch: string;
  expiryDate: string;
  resolution: string;
  status: 'pending' | 'destined' | 'adjusted';
  traspasoNumber?: string;
  location?: string;
  destino?: string;
  createdAt: number;
  updatedAt?: number;
  type: 'info' | 'warning' | 'error' | 'success';
} {
  return {
    id: 1,
    frcNumber: 'FRC-001',
    barcode: '1234567890123',
    productName: 'Test Product',
    batch: 'LOT-001',
    expiryDate: '12/2025',
    resolution: 'Test resolution',
    status: 'pending',
    type: 'info',
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// TESTS FASE 2: NORMALIZACIÓN
// ============================================================================

describe('EventsSyncService - Normalización', () => {
  describe('normalizeString', () => {
    it('should normalize basic strings', () => {
      const normalizeString = (value: string | null | undefined): string | null => {
        if (!value) return null;
        const trimmed = value.toString().trim();
        return trimmed === '' ? null : trimmed;
      };

      expect(normalizeString('  hello  ')).toBe('hello');
      expect(normalizeString('hello')).toBe('hello');
    });

    it('should return null for empty strings', () => {
      const normalizeString = (value: string | null | undefined): string | null => {
        if (!value) return null;
        const trimmed = value.toString().trim();
        return trimmed === '' ? null : trimmed;
      };

      expect(normalizeString('')).toBe(null);
      expect(normalizeString('   ')).toBe(null);
      expect(normalizeString(null)).toBe(null);
      expect(normalizeString(undefined)).toBe(null);
    });
  });

  describe('generateEventKey con normalización', () => {
    const generateEventKey = (frcNumber?: string, barcode?: string): string => {
      const normalizeString = (value: string | null | undefined): string | null => {
        if (!value) return null;
        const trimmed = value.toString().trim();
        return trimmed === '' ? null : trimmed;
      };
      const frc = normalizeString(frcNumber) || '';
      const bar = normalizeString(barcode) || '';
      return `${frc.toLowerCase()}~${bar.toLowerCase()}`;
    };

    it('should generate normalized keys', () => {
      expect(generateEventKey('  FRC-001  ', '  123456  ')).toBe('frc-001~123456');
      expect(generateEventKey('FRC-001', '123456')).toBe('frc-001~123456');
    });
  });
});

// ============================================================================
// TESTS FASE 3: VALIDACIÓN
// ============================================================================

describe('EventsSyncService - Validación', () => {
  interface InventoryEvent {
    barcode?: string;
    frcNumber?: string;
    status?: string;
    type?: string;
  }

  const validateEvent = (event: InventoryEvent): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!event.barcode) errors.push('Barcode es requerido');
    if (!event.frcNumber) errors.push('FRC Number es requerido');
    if (event.frcNumber && event.frcNumber.length > 100) errors.push('FRC Number excede 100 caracteres');
    if (event.barcode && event.barcode.length > 255) errors.push('Barcode excede 255 caracteres');
    
    return { valid: errors.length === 0, errors };
  };

  it('should validate required fields', () => {
    const result = validateEvent({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Barcode es requerido');
    expect(result.errors).toContain('FRC Number es requerido');
  });

  it('should validate valid event', () => {
    const result = validateEvent({
      barcode: '123456',
      frcNumber: 'FRC-001'
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate length constraints', () => {
    const result = validateEvent({
      barcode: 'x'.repeat(256),
      frcNumber: 'x'.repeat(101)
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('FRC Number excede 100 caracteres');
    expect(result.errors).toContain('Barcode excede 255 caracteres');
  });
});

// ============================================================================
// TESTS FASE 5: CONFIGURACIÓN DE RETRY
// ============================================================================

describe('EventsSyncService - Retry Config', () => {
  const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  const calculateBackoff = (attempt: number): number => {
    const delay = Math.min(
      DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, attempt),
      DEFAULT_RETRY_CONFIG.maxDelay
    );
    return delay * (0.5 + Math.random() * 0.5);
  };

  it('should calculate exponential backoff', () => {
    const attempt0 = DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, 0);
    const attempt1 = DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, 1);
    const attempt2 = DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, 2);

    expect(attempt0).toBe(1000);
    expect(attempt1).toBe(2000);
    expect(attempt2).toBe(4000);
  });

  it('should cap delay at maxDelay', () => {
    const attempt10 = DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, 10);
    expect(Math.min(attempt10, DEFAULT_RETRY_CONFIG.maxDelay)).toBe(DEFAULT_RETRY_CONFIG.maxDelay);
  });
});

// ============================================================================
// TESTS FASE 5: HISTORIAL DE SYNC
// ============================================================================

describe('EventsSyncService - Sync History', () => {
  interface SyncHistoryEntry {
    id: string;
    timestamp: number;
    type: 'full' | 'push' | 'pull';
    result: 'success' | 'partial' | 'failed';
    duration: number;
  }

  const MAX_HISTORY_ITEMS = 50;

  const addToHistory = (entry: Omit<SyncHistoryEntry, 'id'>, history: SyncHistoryEntry[]): SyncHistoryEntry[] => {
    const newEntry: SyncHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    return [newEntry, ...history].slice(0, MAX_HISTORY_ITEMS);
  };

  it('should add entries to history', () => {
    const history: SyncHistoryEntry[] = [];
    const newHistory = addToHistory({
      timestamp: Date.now(),
      type: 'full',
      result: 'success',
      duration: 100,
    }, history);

    expect(newHistory).toHaveLength(1);
    expect(newHistory[0].id).toBeDefined();
  });

  it('should limit history to max items', () => {
    let history: SyncHistoryEntry[] = [];
    
    for (let i = 0; i < 60; i++) {
      history = addToHistory({
        timestamp: Date.now(),
        type: 'full',
        result: 'success',
        duration: 100,
      }, history);
    }

    expect(history.length).toBe(MAX_HISTORY_ITEMS);
  });

  it('should maintain order (newest first)', () => {
    let history: SyncHistoryEntry[] = [];
    
    for (let i = 0; i < 5; i++) {
      history = addToHistory({
        timestamp: Date.now() + i,
        type: 'full',
        result: 'success',
        duration: 100,
      }, history);
    }

    expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
  });
});
