/**
 * csvExport Tests
 */

import { describe, it, expect } from 'vitest';
import { exportToCSV, parseCSV } from './csvExport';

describe('csvExport', () => {
  describe('exportToCSV', () => {
    it('should be a function', () => {
      expect(typeof exportToCSV).toBe('function');
    });
  });

  describe('parseCSV', () => {
    it('should be a function', () => {
      expect(typeof parseCSV).toBe('function');
    });
  });
});
