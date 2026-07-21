/**
 * Tests para syncEventFilters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEventKey } from './syncEventFilters';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe('syncEventFilters', () => {
  describe('generateEventKey', () => {
    it('should generate key from frcNumber and barcode', () => {
      const event = { frcNumber: 'FRC123', barcode: 'BAR456' };
      expect(generateEventKey(event)).toBe('frc123~bar456');
    });

    it('should generate key from frc and barcode', () => {
      const event = { frc: 'FRC789', barcode: 'BAR012' };
      expect(generateEventKey(event)).toBe('frc789~bar012');
    });

    it('should handle empty values', () => {
      const event = { frcNumber: '', barcode: '' };
      expect(generateEventKey(event)).toBe('~');
    });

    it('should trim whitespace', () => {
      const event = { frcNumber: '  FRC123  ', barcode: '  BAR456  ' };
      expect(generateEventKey(event)).toBe('frc123~bar456');
    });
  });
});
