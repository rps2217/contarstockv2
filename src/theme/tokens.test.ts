import { describe, it, expect } from 'vitest';
import { 
  colors, 
  spacing, 
  typography, 
  shadows, 
  borders, 
  animations, 
  zIndex, 
  designTokens,
  statusClasses,
  expiryStatusClasses,
  buttonSizes,
  buttonVariants,
  getSyncStatusClass,
  getExpiryStatusClass,
  getPriorityClass,
  cn,
  getStatusIcon,
} from './index';

describe('Theme Tokens', () => {
  describe('colors', () => {
    it('should have brand colors defined', () => {
      expect(colors.brand.info).toBe('#3b82f6');
      expect(colors.brand.success).toBe('#22c55e');
      expect(colors.brand.warning).toBe('#f59e0b');
      expect(colors.brand.danger).toBe('#ef4444');
    });

    it('should have status colors defined', () => {
      expect(colors.status.synced).toBe('#22c55e');
      expect(colors.status.pending).toBe('#f59e0b');
      expect(colors.status.error).toBe('#ef4444');
    });

    it('should have expiry colors defined', () => {
      expect(colors.expiry.expired).toBe('#ef4444');
      expect(colors.expiry.critical).toBe('#f97316');
      expect(colors.expiry.safe).toBe('#22c55e');
    });
  });

  describe('spacing', () => {
    it('should have common spacing values', () => {
      expect(spacing[1]).toBe('0.25rem');
      expect(spacing[2]).toBe('0.5rem');
      expect(spacing[4]).toBe('1rem');
      expect(spacing[8]).toBe('2rem');
    });
  });

  describe('typography', () => {
    it('should have font sizes defined', () => {
      expect(typography.fontSize.xs).toBe('0.75rem');
      expect(typography.fontSize.sm).toBe('0.875rem');
      expect(typography.fontSize.base).toBe('1rem');
      expect(typography.fontSize.lg).toBe('1.125rem');
    });

    it('should have font weights defined', () => {
      expect(typography.fontWeight.normal).toBe('400');
      expect(typography.fontWeight.medium).toBe('500');
      expect(typography.fontWeight.bold).toBe('700');
    });
  });

  describe('shadows', () => {
    it('should have shadow values defined', () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.DEFAULT).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
      expect(shadows.xl).toBeDefined();
    });
  });

  describe('borders', () => {
    it('should have border radius values', () => {
      expect(borders.radius.none).toBe('0');
      expect(borders.radius.sm).toBe('0.125rem');
      expect(borders.radius.DEFAULT).toBe('0.25rem');
      expect(borders.radius.full).toBe('9999px');
    });
  });

  describe('animations', () => {
    it('should have duration values', () => {
      expect(animations.duration.fast).toBe('150ms');
      expect(animations.duration.DEFAULT).toBe('200ms');
      expect(animations.duration.slow).toBe('300ms');
    });

    it('should have easing values', () => {
      expect(animations.easing.DEFAULT).toBeDefined();
      expect(animations.easing.in).toBeDefined();
      expect(animations.easing.out).toBeDefined();
    });
  });

  describe('zIndex', () => {
    it('should have z-index values', () => {
      expect(zIndex.dropdown).toBe('10');
      expect(zIndex.sticky).toBe('20');
      expect(zIndex.modal).toBe('50');
      expect(zIndex.tooltip).toBe('70');
    });
  });

  describe('designTokens export', () => {
    it('should export all token categories', () => {
      expect(designTokens.colors).toBeDefined();
      expect(designTokens.spacing).toBeDefined();
      expect(designTokens.typography).toBeDefined();
      expect(designTokens.shadows).toBeDefined();
      expect(designTokens.borders).toBeDefined();
      expect(designTokens.animations).toBeDefined();
      expect(designTokens.zIndex).toBeDefined();
    });
  });
});

describe('Status Classes', () => {
  it('should have synced status class', () => {
    expect(statusClasses.synced).toBe('bg-green-100 text-green-800');
  });

  it('should have pending status class', () => {
    expect(statusClasses.pending).toBe('bg-amber-100 text-amber-800');
  });

  it('should have error status class', () => {
    expect(statusClasses.error).toBe('bg-red-100 text-red-800');
  });
});

describe('Expiry Status Classes', () => {
  it('should have expired status class', () => {
    expect(expiryStatusClasses.expired).toBe('bg-red-100 text-red-800 border-red-200');
  });

  it('should have critical status class', () => {
    expect(expiryStatusClasses.critical).toBe('bg-orange-100 text-orange-800 border-orange-200');
  });

  it('should have safe status class', () => {
    expect(expiryStatusClasses.safe).toBe('bg-green-100 text-green-800 border-green-200');
  });
});

describe('Button Classes', () => {
  it('should have button sizes', () => {
    expect(buttonSizes.sm).toBe('h-8 px-3 text-xs');
    expect(buttonSizes.md).toBe('h-10 px-4 text-sm');
    expect(buttonSizes.lg).toBe('h-12 px-6 text-base');
  });

  it('should have button variants', () => {
    expect(buttonVariants.primary).toBe('bg-brand-info text-white hover:bg-blue-600');
    expect(buttonVariants.danger).toBe('bg-red-500 text-white hover:bg-red-600');
    expect(buttonVariants.ghost).toBe('bg-transparent text-slate-600 hover:bg-slate-100');
  });
});

describe('Helper Functions', () => {
  describe('getSyncStatusClass', () => {
    it('should return synced class', () => {
      expect(getSyncStatusClass('synced')).toBe('bg-green-100 text-green-800');
    });

    it('should return pending class', () => {
      expect(getSyncStatusClass('pending')).toBe('bg-amber-100 text-amber-800');
    });

    it('should return error class', () => {
      expect(getSyncStatusClass('error')).toBe('bg-red-100 text-red-800');
    });
  });

  describe('getExpiryStatusClass', () => {
    it('should return expired class', () => {
      expect(getExpiryStatusClass('expired')).toBe('bg-red-100 text-red-800 border-red-200');
    });

    it('should return critical class', () => {
      expect(getExpiryStatusClass('critical')).toBe('bg-orange-100 text-orange-800 border-orange-200');
    });

    it('should return safe class', () => {
      expect(getExpiryStatusClass('safe')).toBe('bg-green-100 text-green-800 border-green-200');
    });

    it('should return default class for unknown status', () => {
      expect(getExpiryStatusClass('next_expiry')).toBe('bg-yellow-100 text-yellow-800 border-yellow-200');
    });
  });

  describe('getPriorityClass', () => {
    it('should return low priority class', () => {
      expect(getPriorityClass('low')).toBe('text-slate-500');
    });

    it('should return critical priority class', () => {
      expect(getPriorityClass('critical')).toBe('text-red-500');
    });
  });

  describe('cn (className utility)', () => {
    it('should combine class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should filter falsy values', () => {
      expect(cn('class1', undefined, 'class2', null, false)).toBe('class1 class2');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });
  });

  describe('getStatusIcon', () => {
    it('should return check icon for synced', () => {
      expect(getStatusIcon('synced')).toBe('✓');
    });

    it('should return pending icon', () => {
      expect(getStatusIcon('pending')).toBe('◐');
    });

    it('should return error icon', () => {
      expect(getStatusIcon('error')).toBe('✗');
    });
  });
});
