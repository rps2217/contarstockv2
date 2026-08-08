/**
 * ExportFactory Tests
 */

import { describe, it, expect } from 'vitest';
import { ExportFactory } from './ExportFactory';

describe('ExportFactory', () => {
  describe('ExportFactory class', () => {
    it('should be a class/function', () => {
      expect(typeof ExportFactory).toBe('function');
    });

    it('should be instantiable', () => {
      expect(() => new ExportFactory()).not.toThrow();
    });
  });
});
