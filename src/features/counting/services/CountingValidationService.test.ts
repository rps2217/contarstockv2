/**
 * CountingValidationService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CountingValidationService, type ValidationSeverity } from './CountingValidationService';

describe('CountingValidationService', () => {
  beforeEach(() => {
    CountingValidationService.reset();
  });

  describe('validateScan', () => {
    const expectedItems = new Map([
      ['SKU001', { name: 'Producto A', expectedQuantity: 10 }],
      ['SKU002', { name: 'Producto B', expectedQuantity: 5 }],
    ]);

    it('should return OK for correct quantity', () => {
      const result = CountingValidationService.validateScan('SKU001', 10, expectedItems);

      expect(result.isValid).toBe(true);
      expect(result.severity).toBe('ok');
      expect(result.message).toContain('Correcto');
    });

    it('should return warning for unexpected product', () => {
      const result = CountingValidationService.validateScan('UNKNOWN', 1, expectedItems);

      expect(result.isValid).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.message).toContain('no esperado');
    });

    it('should return warning for minor discrepancy', () => {
      const result = CountingValidationService.validateScan('SKU001', 12, expectedItems);

      expect(result.isValid).toBe(true);
      expect(result.severity).toBe('warning');
    });

    it('should return critical for large discrepancy', () => {
      const result = CountingValidationService.validateScan('SKU001', 20, expectedItems);

      expect(result.isValid).toBe(true);
      expect(result.severity).toBe('critical');
    });

    it('should return error for over-counting threshold', () => {
      // More than 3x expected
      const result = CountingValidationService.validateScan('SKU001', 35, expectedItems);

      expect(result.severity).toBe('error');
    });
  });

  describe('isDuplicate', () => {
    it('should detect duplicate within window', () => {
      CountingValidationService.recordScan('SKU001');
      const isDup = CountingValidationService.isDuplicate('SKU001');

      expect(isDup).toBe(true);
    });

    it('should not detect duplicate after window', async () => {
      CountingValidationService.recordScan('SKU001');

      // Simulate time passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(31000);

      const isDup = CountingValidationService.isDuplicate('SKU001');

      expect(isDup).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('calculateSummary', () => {
    it('should calculate correct summary', () => {
      const expected = new Map([
        ['SKU001', { name: 'A', expectedQuantity: 10 }],
        ['SKU002', { name: 'B', expectedQuantity: 100 }], // Higher to avoid critical threshold
        ['SKU003', { name: 'C', expectedQuantity: 8 }],
      ]);

      const scanned = new Map([
        ['SKU001', { quantity: 10 }], // complete
        ['SKU002', { quantity: 95 }], // partial (5% diff = warning, not critical)
        ['SKU004', { quantity: 2 }], // unexpected
      ]);

      const summary = CountingValidationService.calculateSummary(
        expected,
        scanned,
        Date.now() - 60000 // 1 minute ago
      );

      expect(summary.expectedItems).toBe(3);
      expect(summary.completeItems).toBe(1);
      expect(summary.partialItems).toBe(1);
      expect(summary.missingItems).toBe(1); // SKU003 not scanned
      expect(summary.unexpectedItems).toBe(1);
    });

    it('should calculate progress percent', () => {
      const expected = new Map([
        ['SKU001', { name: 'A', expectedQuantity: 10 }],
        ['SKU002', { name: 'B', expectedQuantity: 5 }],
      ]);

      const scanned = new Map([
        ['SKU001', { quantity: 10 }], // complete
        // SKU002 not scanned
      ]);

      const summary = CountingValidationService.calculateSummary(expected, scanned, Date.now());

      expect(summary.progressPercent).toBe(50);
    });
  });

  describe('generateDiscrepancyReport', () => {
    it('should list discrepancies sorted by severity', () => {
      const expected = new Map([
        ['SKU001', { name: 'Correcto', expectedQuantity: 10 }],
        ['SKU002', { name: 'Parcial', expectedQuantity: 5 }],
        ['SKU003', { name: 'Faltante', expectedQuantity: 8 }],
      ]);

      const scanned = new Map([
        ['SKU001', { quantity: 10 }], // OK
        ['SKU002', { quantity: 3 }], // Partial
        ['SKU004', { quantity: 2 }], // Unexpected
      ]);

      const report = CountingValidationService.generateDiscrepancyReport(expected, scanned);

      // First items should have warnings/critical (SKU003 missing, SKU002 partial)
      // Then unexpected items (SKU004)
      // Then OK items (SKU001)
      expect(report.length).toBe(4);
      expect(report.filter(i => i.severity === 'ok').length).toBe(1);
      expect(report.filter(i => i.severity === 'warning').length).toBe(3);
    });

    it('should mark missing items correctly', () => {
      const expected = new Map([['SKU001', { name: 'Test', expectedQuantity: 5 }]]);

      const scanned = new Map<string, { quantity: number }>();

      const report = CountingValidationService.generateDiscrepancyReport(expected, scanned);

      expect(report[0].status).toBe('missing');
      expect(report[0].scannedQuantity).toBe(0);
      expect(report[0].discrepancy).toBe(-5);
    });
  });

  describe('updateConfig', () => {
    it('should update thresholds', () => {
      CountingValidationService.updateConfig({
        warningThreshold: 5,
        criticalThreshold: 15,
      });

      const expected = new Map([['SKU001', { name: 'A', expectedQuantity: 100 }]]);

      // 8% difference should be warning with 5% threshold
      const result = CountingValidationService.validateScan('SKU001', 108, expected);

      expect(result.severity).toBe('warning');
    });
  });
});
