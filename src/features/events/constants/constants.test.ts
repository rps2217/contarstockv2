import { describe, it, expect } from 'vitest';
import { EVENT_TYPES, DESTINOS } from './eventConstants';

describe('eventConstants', () => {
  describe('EVENT_TYPES', () => {
    it('should have required event types', () => {
      expect(EVENT_TYPES).toBeDefined();
      expect(Array.isArray(EVENT_TYPES)).toBe(true);
      expect(EVENT_TYPES.length).toBeGreaterThan(0);
    });

    it('should have string values', () => {
      EVENT_TYPES.forEach(tipo => {
        expect(typeof tipo).toBe('string');
        expect(tipo.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DESTINOS', () => {
    it('should have required destinations', () => {
      expect(DESTINOS).toBeDefined();
      expect(Array.isArray(DESTINOS)).toBe(true);
      expect(DESTINOS.length).toBeGreaterThan(0);
    });

    it('should have string values', () => {
      DESTINOS.forEach(dest => {
        expect(typeof dest).toBe('string');
      });
    });

    it('should have expected destinations', () => {
      expect(DESTINOS).toContain('BOD. 37');
      expect(DESTINOS).toContain('BOD. 80');
    });
  });

});
