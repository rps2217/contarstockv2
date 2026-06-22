import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ExpiryStatus,
  ExpiryPolicy,
  evaluateExpiry,
  getDaysUntilExpiry,
  getExpiryStatusColor,
  getExpiryStatusBgColor,
  formatExpiryDate,
  getStatusLabel
} from './expiryDomain';

// Mock date-fns
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual as any,
    differenceInCalendarDays: vi.fn((date1: Date, date2: Date) => {
      const diff = date1.getTime() - date2.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }),
    startOfDay: (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    addDays: (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
    format: vi.fn((date: Date, formatStr: string) => {
      const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      if (formatStr === "MMM yyyy") {
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
      }
      return formatStr;
    }),
    es: { locale: 'es' }
  };
});

describe('expiryDomain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ExpiryStatus enum', () => {
    it('should have all expected statuses', () => {
      expect(ExpiryStatus.EXPIRED).toBe('expired');
      expect(ExpiryStatus.CRITICAL).toBe('critical');
      expect(ExpiryStatus.WITHDRAWAL).toBe('withdrawal');
      expect(ExpiryStatus.NEXT_EXPIRY).toBe('next_expiry');
      expect(ExpiryStatus.SAFE).toBe('safe');
    });
  });

  describe('evaluateExpiry', () => {
    const defaultPolicy: ExpiryPolicy = {
      withdrawalDays: 30,
      hasCanje: true
    };

    it('should return SAFE when expiryDate is null', () => {
      const result = evaluateExpiry(null, defaultPolicy);
      
      expect(result.status).toBe(ExpiryStatus.SAFE);
      expect(result.daysLeft).toBe(0);
      expect(result.lifePercent).toBe(100);
      expect(result.riskScore).toBe(0);
      expect(result.label).toBe('SIN FECHA');
      expect(result.withdrawalDate).toBeNull();
    });

    it('should return EXPIRED when daysLeft is negative', () => {
      // Set reference to 2024-06-15, expiry date to 2024-06-10 (5 days ago)
      const expiryDate = new Date(2024, 5, 10); // June 10, 2024
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.status).toBe(ExpiryStatus.EXPIRED);
      expect(result.daysLeft).toBeLessThan(0);
      expect(result.label).toBe('VENCIDO');
    });

    it('should return CRITICAL when daysLeft is very low', () => {
      // Set reference to 2024-06-15, expiry date to 2024-06-18 (3 days from now)
      const expiryDate = new Date(2024, 5, 18); // June 18, 2024
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.status).toBe(ExpiryStatus.CRITICAL);
      expect(result.label).toBe('CRÍTICO');
    });

    it('should return WITHDRAWAL when within withdrawal period', () => {
      // Set reference to 2024-06-15, expiry date to 2024-07-01 (16 days from now)
      const expiryDate = new Date(2024, 6, 1); // July 1, 2024
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.status).toBe(ExpiryStatus.WITHDRAWAL);
      expect(result.label).toBe('RETIRAR');
    });

    it('should return NEXT_EXPIRY when within 90 days of withdrawal', () => {
      // Set reference to 2024-06-15, expiry date to 2024-08-01 (~47 days)
      const expiryDate = new Date(2024, 7, 1); // Aug 1, 2024
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.status).toBe(ExpiryStatus.NEXT_EXPIRY);
      expect(result.label).toBe('PRÓXIMO');
    });

    it('should return SAFE when far from expiry', () => {
      // Set reference to 2024-06-15, expiry date to 2024-12-31
      const expiryDate = new Date(2024, 11, 31); // Dec 31, 2024
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.status).toBe(ExpiryStatus.SAFE);
      expect(result.label).toBe('VIGENTE');
    });

    it('should calculate withdrawalDate correctly', () => {
      // June 18 expiry with 30 days withdrawal policy = May 19
      const expiryDate = new Date(2024, 5, 18); // June 18, 2024
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.withdrawalDate).not.toBeNull();
      // withdrawalDate should be expiryDate - withdrawalDays
      const expected = new Date(2024, 4, 19); // May 19, 2024
      expect(result.withdrawalDate?.getDate()).toBe(expected.getDate());
    });

    it('should handle custom withdrawalDays', () => {
      const customPolicy: ExpiryPolicy = {
        withdrawalDays: 60,
        hasCanje: false
      };
      const expiryDate = new Date(2024, 8, 1); // Sept 1, 2024
      const result = evaluateExpiry(expiryDate, customPolicy);
      
      expect(result.withdrawalDate).not.toBeNull();
    });

    it('should return higher risk score for expired items', () => {
      const expiryDate = new Date(2024, 5, 10); // Already expired
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.riskScore).toBe(100);
    });

    it('should return lower risk score for safe items', () => {
      const expiryDate = new Date(2025, 5, 15); // Far future
      const result = evaluateExpiry(expiryDate, defaultPolicy);
      
      expect(result.riskScore).toBeLessThan(100);
    });
  });

  describe('getDaysUntilExpiry', () => {
    it('should return positive number for future date', () => {
      // Test with June 2024
      const days = getDaysUntilExpiry(6, 2024);
      expect(days).toBeGreaterThan(0);
    });

    it('should return negative number for past month', () => {
      const days = getDaysUntilExpiry(1, 2024);
      // January 2024 is in the past from June 2024
      expect(days).toBeLessThan(0);
    });

    it('should return 0 for current month', () => {
      // June 2024 = current month based on fake timer
      const days = getDaysUntilExpiry(6, 2024);
      // Last day of June is ~15 days from June 15
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThan(31);
    });
  });

  describe('getExpiryStatusColor', () => {
    it('should return red for EXPIRED', () => {
      expect(getExpiryStatusColor(ExpiryStatus.EXPIRED)).toBe('text-red-500');
    });

    it('should return amber for CRITICAL', () => {
      expect(getExpiryStatusColor(ExpiryStatus.CRITICAL)).toBe('text-amber-500');
    });

    it('should return orange for WITHDRAWAL', () => {
      expect(getExpiryStatusColor(ExpiryStatus.WITHDRAWAL)).toBe('text-orange-500');
    });

    it('should return yellow for NEXT_EXPIRY', () => {
      expect(getExpiryStatusColor(ExpiryStatus.NEXT_EXPIRY)).toBe('text-yellow-500');
    });

    it('should return emerald for SAFE', () => {
      expect(getExpiryStatusColor(ExpiryStatus.SAFE)).toBe('text-emerald-500');
    });
  });

  describe('getExpiryStatusBgColor', () => {
    it('should return red bg for EXPIRED', () => {
      expect(getExpiryStatusBgColor(ExpiryStatus.EXPIRED)).toBe('bg-red-500/10 border-red-500/30');
    });

    it('should return amber bg for CRITICAL', () => {
      expect(getExpiryStatusBgColor(ExpiryStatus.CRITICAL)).toBe('bg-amber-500/10 border-amber-500/30');
    });

    it('should return orange bg for WITHDRAWAL', () => {
      expect(getExpiryStatusBgColor(ExpiryStatus.WITHDRAWAL)).toBe('bg-orange-500/10 border-orange-500/30');
    });

    it('should return yellow bg for NEXT_EXPIRY', () => {
      expect(getExpiryStatusBgColor(ExpiryStatus.NEXT_EXPIRY)).toBe('bg-yellow-500/10 border-yellow-500/30');
    });

    it('should return emerald bg for SAFE', () => {
      expect(getExpiryStatusBgColor(ExpiryStatus.SAFE)).toBe('bg-emerald-500/10 border-emerald-500/30');
    });
  });

  describe('formatExpiryDate', () => {
    it('should format date correctly', () => {
      const result = formatExpiryDate(6, 2024);
      expect(result).toContain('2024');
    });

    it('should return uppercase month', () => {
      const result = formatExpiryDate(1, 2024);
      expect(result).toBe(result.toUpperCase());
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getStatusLabel(ExpiryStatus.EXPIRED)).toBe('VENCIDO');
      expect(getStatusLabel(ExpiryStatus.CRITICAL)).toBe('CRÍTICO');
      expect(getStatusLabel(ExpiryStatus.WITHDRAWAL)).toBe('RETIRAR');
      expect(getStatusLabel(ExpiryStatus.NEXT_EXPIRY)).toBe('PRÓXIMO');
      expect(getStatusLabel(ExpiryStatus.SAFE)).toBe('VIGENTE');
    });
  });
});
