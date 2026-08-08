/**
 * pdfExport Tests
 */

import { describe, it, expect } from 'vitest';
import { exportToPDF, exportSessionManifestPDF, exportDiscrepancyPDF } from './pdfExport';

describe('pdfExport', () => {
  describe('exportToPDF', () => {
    it('should be a function', () => {
      expect(typeof exportToPDF).toBe('function');
    });
  });

  describe('exportSessionManifestPDF', () => {
    it('should be a function', () => {
      expect(typeof exportSessionManifestPDF).toBe('function');
    });
  });

  describe('exportDiscrepancyPDF', () => {
    it('should be a function', () => {
      expect(typeof exportDiscrepancyPDF).toBe('function');
    });
  });
});
