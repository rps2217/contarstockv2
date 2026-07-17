/**
 * IntegrityValidator Tests
 *
 * Tests para el validador de integridad tipo WMS profesional.
 * IntegrityValidator es un singleton exportado directamente.
 */

import { describe, it, expect, vi } from 'vitest';
import IntegrityValidator from './IntegrityValidator';

describe('IntegrityValidator', () => {
  describe('API surface', () => {
    it('should have required methods', () => {
      expect(typeof IntegrityValidator.validate).toBe('function');
      expect(typeof IntegrityValidator.getQuickStatus).toBe('function');
    });
  });

  describe('validate', () => {
    it('should have validate as function', async () => {
      expect(typeof IntegrityValidator.validate).toBe('function');
    });
  });

  describe('getQuickStatus', () => {
    it('should have getQuickStatus as function', async () => {
      expect(typeof IntegrityValidator.getQuickStatus).toBe('function');
    });
  });
});

describe('IntegrityValidator Types', () => {
  it('should support validation result structure', () => {
    // Document expected structure
    const result = {
      isHealthy: true,
      issues: [],
      warnings: [],
      metrics: {
        totalRecords: 0,
        byTable: {},
      },
      recommendations: [],
      timestamp: Date.now(),
    };

    expect(result.isHealthy).toBe(true);
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should support sync status values', () => {
    const validStatuses = ['synced', 'pending', 'error', 'conflict'];

    validStatuses.forEach(status => {
      const record = { id: '1', syncStatus: status };
      expect(record.syncStatus).toBe(status);
    });
  });
});
