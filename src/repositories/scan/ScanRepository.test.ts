/**
 * ScanRepository Tests
 */

import { describe, it, expect } from 'vitest';
import { scanRepository, ScanRepository, ScanRepositoryLegacy } from './ScanRepository';
import type { ScanRecord } from '../../types';

describe('ScanRepository', () => {
  describe('API surface', () => {
    it('should have all required methods', () => {
      const repo = new ScanRepository();

      expect(typeof repo.save).toBe('function');
      expect(typeof repo.saveBatch).toBe('function');
      expect(typeof repo.getBySession).toBe('function');
      expect(typeof repo.getAll).toBe('function');
      expect(typeof repo.get).toBe('function');
      expect(typeof repo.delete).toBe('function');
      expect(typeof repo.markAsSynced).toBe('function');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(scanRepository).toBeDefined();
      expect(scanRepository).toBeInstanceOf(ScanRepository);
    });
  });

  describe('legacy wrapper', () => {
    it('should export ScanRepositoryLegacy', () => {
      expect(ScanRepositoryLegacy).toBeDefined();
      expect(typeof ScanRepositoryLegacy.save).toBe('function');
      expect(typeof ScanRepositoryLegacy.getBySession).toBe('function');
      expect(typeof ScanRepositoryLegacy.markAsSynced).toBe('function');
    });
  });
});

describe('ScanRepository Types', () => {
  it('should support ScanRecord structure', () => {
    const scan: ScanRecord = {
      id: 'scan-123',
      sessionId: 'session-456',
      barcode: '7501234567890',
      quantity: 5,
      timestamp: Date.now(),
      synced: 0,
      syncStatus: 'pending',
      isIncident: false,
    };

    expect(scan.id).toBe('scan-123');
    expect(scan.barcode).toBe('7501234567890');
    expect(scan.quantity).toBe(5);
    expect(scan.syncStatus).toBe('pending');
  });

  it('should support sync status values', () => {
    const validStatuses = ['pending', 'synced', 'error', 'conflict'];

    validStatuses.forEach(status => {
      const scan = { id: '1', syncStatus: status as ScanRecord['syncStatus'] };
      expect(scan.syncStatus).toBe(status);
    });
  });

  it('should support incident scans', () => {
    const incidentScan: ScanRecord = {
      id: 'incident-1',
      sessionId: 'session-1',
      barcode: '7501234567890',
      quantity: 0,
      timestamp: Date.now(),
      synced: 0,
      syncStatus: 'pending',
      isIncident: true,
    };

    expect(incidentScan.isIncident).toBe(true);
  });
});
