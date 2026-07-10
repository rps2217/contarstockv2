/**
 * Services Constants Tests
 *
 * Tests para las constantes de servicios.
 */

import { describe, it, expect } from 'vitest';
import { CLOUD_COLUMNS, SYNC_ENGINE_VERSION } from './constants';

describe('Services Constants', () => {
  describe('CLOUD_COLUMNS', () => {
    it('should have ID field', () => {
      expect(CLOUD_COLUMNS.ID).toBeDefined();
      expect(typeof CLOUD_COLUMNS.ID).toBe('string');
    });

    it('should have UNIQUE_KEY field', () => {
      expect(CLOUD_COLUMNS.UNIQUE_KEY).toBeDefined();
    });

    it('should have all required date fields', () => {
      expect(CLOUD_COLUMNS.ENTRY_DATE).toBeDefined();
      expect(CLOUD_COLUMNS.DATE).toBeDefined();
    });

    it('should have ERP_ORDER field', () => {
      expect(CLOUD_COLUMNS.ERP_ORDER).toBeDefined();
    });

    it('should have barcode and product fields', () => {
      expect(CLOUD_COLUMNS.BARCODE).toBeDefined();
      expect(CLOUD_COLUMNS.PRODUCT_NAME).toBeDefined();
    });

    it('should have quantity fields', () => {
      expect(CLOUD_COLUMNS.QUANTITY).toBeDefined();
      expect(CLOUD_COLUMNS.EXPECTED).toBeDefined();
      expect(CLOUD_COLUMNS.DIFF).toBeDefined();
    });

    it('should have audit fields', () => {
      expect(CLOUD_COLUMNS.AUDIT_STATUS).toBeDefined();
      expect(CLOUD_COLUMNS.AUDIT_SCORE).toBeDefined();
    });

    it('should have IA metadata fields', () => {
      expect(CLOUD_COLUMNS.IA_SIGNATURE).toBeDefined();
      expect(CLOUD_COLUMNS.PHOTO_URL).toBeDefined();
    });

    it('should have time-based fields', () => {
      expect(CLOUD_COLUMNS.MONTH).toBeDefined();
      expect(CLOUD_COLUMNS.YEAR).toBeDefined();
    });

    it('should have all values as non-empty strings', () => {
      Object.values(CLOUD_COLUMNS).forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SYNC_ENGINE_VERSION', () => {
    it('should be defined', () => {
      expect(SYNC_ENGINE_VERSION).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof SYNC_ENGINE_VERSION).toBe('string');
    });

    it('should follow semver format', () => {
      const versionPattern = /^\d+\.\d+\.\d+/;
      expect(SYNC_ENGINE_VERSION).toMatch(versionPattern);
    });

    it('should contain AI in version string', () => {
      expect(SYNC_ENGINE_VERSION).toContain('AI');
    });
  });
});
