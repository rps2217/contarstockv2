import { describe, it, expect } from 'vitest';
import {
  EventStatus,
  evaluateEventStatus,
  getEventStatusLabel,
  getEventStatusConfig,
  normalizeText,
  calculateEventStats,
  eventMatchesSearch
} from './eventsDomain';

describe('eventsDomain', () => {
  describe('EventStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(EventStatus.PENDING).toBe('PENDING');
      expect(EventStatus.DESTINED).toBe('DESTINED');
      expect(EventStatus.ADJUSTED).toBe('ADJUSTED');
    });
  });

  describe('evaluateEventStatus', () => {
    it('should return ADJUSTED when isAdjusted is true', () => {
      const result = evaluateEventStatus({ isAdjusted: true, destino: null });
      expect(result).toBe(EventStatus.ADJUSTED);
    });

    it('should return ADJUSTED when isAdjusted is true even with destino', () => {
      const result = evaluateEventStatus({ isAdjusted: true, destino: 'BOD.37' });
      expect(result).toBe(EventStatus.ADJUSTED);
    });

    it('should return DESTINED when has destino and not adjusted', () => {
      const result = evaluateEventStatus({ isAdjusted: false, destino: 'BOD.37' });
      expect(result).toBe(EventStatus.DESTINED);
    });

    it('should return PENDING when no destino and not adjusted', () => {
      const result = evaluateEventStatus({ isAdjusted: false, destino: null });
      expect(result).toBe(EventStatus.PENDING);
    });

    it('should return PENDING when destino is empty string', () => {
      const result = evaluateEventStatus({ isAdjusted: false, destino: '' });
      expect(result).toBe(EventStatus.PENDING);
    });
  });

  describe('getEventStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getEventStatusLabel(EventStatus.PENDING)).toBe('Pendiente');
      expect(getEventStatusLabel(EventStatus.DESTINED)).toBe('Destinado');
      expect(getEventStatusLabel(EventStatus.ADJUSTED)).toBe('Ajustado');
    });

    it('should return Desconocido for invalid status', () => {
      expect(getEventStatusLabel('INVALID' as EventStatus)).toBe('Desconocido');
    });
  });

  describe('getEventStatusConfig', () => {
    it('should return config for PENDING status', () => {
      const config = getEventStatusConfig(EventStatus.PENDING);
      expect(config.color).toBe('bg-blue-500');
      expect(config.bg).toBe('bg-blue-500/10');
      expect(config.text).toBe('text-blue-400');
    });

    it('should return config for DESTINED status', () => {
      const config = getEventStatusConfig(EventStatus.DESTINED);
      expect(config.color).toBe('bg-amber-500');
      expect(config.bg).toBe('bg-amber-500/10');
      expect(config.text).toBe('text-amber-400');
    });

    it('should return config for ADJUSTED status', () => {
      const config = getEventStatusConfig(EventStatus.ADJUSTED);
      expect(config.color).toBe('bg-emerald-500');
      expect(config.bg).toBe('bg-emerald-500/10');
      expect(config.text).toBe('text-emerald-400');
    });
  });

  describe('normalizeText', () => {
    it('should convert to uppercase', () => {
      expect(normalizeText('hello')).toBe('HELLO');
      expect(normalizeText('Hello World')).toBe('HELLO WORLD');
    });

    it('should remove accents', () => {
      expect(normalizeText('café')).toBe('CAFE');
      expect(normalizeText('niño')).toBe('NINO');
      expect(normalizeText('ábc')).toBe('ABC');
    });

    it('should trim whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('HELLO');
      expect(normalizeText('\thello\n')).toBe('HELLO');
    });

    it('should handle empty and null strings', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null as any)).toBe('');
      expect(normalizeText(undefined as any)).toBe('');
    });
  });

  describe('calculateEventStats', () => {
    it('should calculate stats correctly', () => {
      const events = [
        { isAdjusted: false, destino: null },     // PENDING
        { isAdjusted: false, destino: 'BOD.37' }, // DESTINED
        { isAdjusted: true, destino: null },      // ADJUSTED
        { isAdjusted: false, destino: null },     // PENDING
        { isAdjusted: false, destino: 'BOD.80' }, // DESTINED
        { isAdjusted: true, destino: null },      // ADJUSTED
      ];

      const stats = calculateEventStats(events);

      expect(stats.total).toBe(6);
      expect(stats.pending).toBe(2);
      expect(stats.destined).toBe(2);
      expect(stats.adjusted).toBe(2);
    });

    it('should return zeros for empty array', () => {
      const stats = calculateEventStats([]);

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.destined).toBe(0);
      expect(stats.adjusted).toBe(0);
    });

    it('should handle all pending events', () => {
      const events = [
        { isAdjusted: false, destino: null },
        { isAdjusted: false, destino: null },
      ];

      const stats = calculateEventStats(events);

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.destined).toBe(0);
      expect(stats.adjusted).toBe(0);
    });
  });

  describe('eventMatchesSearch', () => {
    const mockEvent = {
      barcode: '1234567890',
      productName: 'PRODUCTO TEST',
      destino: 'BOD.37',
      frc: 'FRC001',
      traspaso: 'TRASPASO001'
    };

    it('should return true for empty query', () => {
      expect(eventMatchesSearch(mockEvent, '')).toBe(true);
    });

    it('should match barcode', () => {
      expect(eventMatchesSearch(mockEvent, '1234567890')).toBe(true);
      expect(eventMatchesSearch(mockEvent, '123')).toBe(true);
      expect(eventMatchesSearch(mockEvent, '999')).toBe(false);
    });

    it('should match productName case-insensitively', () => {
      expect(eventMatchesSearch(mockEvent, 'producto')).toBe(true);
      expect(eventMatchesSearch(mockEvent, 'PRODUCTO')).toBe(true);
      expect(eventMatchesSearch(mockEvent, 'Test')).toBe(true);
    });

    it('should match destino', () => {
      expect(eventMatchesSearch(mockEvent, 'BOD.37')).toBe(true);
      expect(eventMatchesSearch(mockEvent, 'BOD')).toBe(true);
    });

    it('should match frc', () => {
      expect(eventMatchesSearch(mockEvent, 'FRC001')).toBe(true);
    });

    it('should match multiple terms', () => {
      expect(eventMatchesSearch(mockEvent, 'PRODUCTO BOD.37')).toBe(true);
      expect(eventMatchesSearch(mockEvent, '123456 BOD')).toBe(true);
    });

    it('should not match non-existent terms', () => {
      expect(eventMatchesSearch(mockEvent, 'NOEXISTE')).toBe(false);
    });

    it('should handle accents in product name', () => {
      const eventWithAccent = {
        ...mockEvent,
        productName: 'CAFÉ PREMIUM'
      };
      expect(eventMatchesSearch(eventWithAccent, 'CAFE')).toBe(true);
    });
  });
});
