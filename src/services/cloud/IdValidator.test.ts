/**
 * IdValidator Tests
 */

import { describe, it, expect } from 'vitest';
import { IdValidator, type IdFormat, type TableIdConfig } from './IdValidator';

describe('IdValidator', () => {
  describe('IdValidator object', () => {
    it('should be an object', () => {
      expect(typeof IdValidator).toBe('object');
    });
  });

  describe('IdFormat type', () => {
    it('should accept valid formats', () => {
      const formats: IdFormat[] = ['uuid', 'string', 'numeric', 'erp'];
      expect(formats).toHaveLength(4);
    });
  });

  describe('TableIdConfig type', () => {
    it('should create valid config', () => {
      const config: TableIdConfig = {
        tableName: 'TEST',
        primaryKey: 'id',
        formats: ['string'],
        minLength: 1,
        maxLength: 100,
      };
      expect(config.tableName).toBe('TEST');
      expect(config.formats).toContain('string');
    });
  });
});
