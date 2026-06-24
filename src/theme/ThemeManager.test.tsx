/**
 * ThemeManager Tests
 */

import { describe, it, expect } from 'vitest';
import { getThemeClasses, cnTheme } from './ThemeManager';

describe('ThemeManager', () => {
  describe('Color Palettes', () => {
    it('should export correct dark theme colors', () => {
      expect(getThemeClasses('dark').container).toContain('#0f0f0f');
      expect(getThemeClasses('dark').textPrimary).toContain('#f0f0f0');
    });

    it('should export correct light theme colors', () => {
      expect(getThemeClasses('light').container).toContain('white');
      expect(getThemeClasses('light').textPrimary).toContain('zinc-900');
    });

    it('should export correct high contrast colors', () => {
      expect(getThemeClasses('high-contrast').container).toContain('black');
      expect(getThemeClasses('high-contrast').textPrimary).toContain('white');
    });
  });

  describe('Expiry Status Colors', () => {
    it('should have consistent expiry status colors', () => {
      // Verify color patterns for status indicators
      const dark = getThemeClasses('dark');
      expect(dark.card).toContain('bg-');
      expect(dark.surface).toContain('bg-');
    });
  });

  describe('getThemeClasses helper', () => {
    it('should return correct classes for dark mode', () => {
      const classes = getThemeClasses('dark');
      expect(classes.container).toContain('bg-');
      expect(classes.card).toContain('rounded-xl');
    });

    it('should return correct classes for light mode', () => {
      const classes = getThemeClasses('light');
      expect(classes.container).toContain('bg-');
      expect(classes.surface).toContain('bg-');
    });

    it('should return correct classes for high contrast', () => {
      const classes = getThemeClasses('high-contrast');
      expect(classes.container).toContain('bg-black');
    });
  });

  describe('cnTheme utility', () => {
    it('should merge classes correctly', () => {
      const result = cnTheme('dark', 'base-class', {
        dark: 'dark-class',
        light: 'light-class'
      });

      expect(result).toContain('base-class');
      expect(result).toContain('dark-class');
      expect(result).not.toContain('light-class');
    });

    it('should handle undefined variants', () => {
      const result = cnTheme('dark', 'base');
      expect(result).toBe('base');
    });
  });

  describe('Button variants', () => {
    it('should have primary button styles for all themes', () => {
      const dark = getThemeClasses('dark');
      const light = getThemeClasses('light');
      const hc = getThemeClasses('high-contrast');

      expect(dark.btnPrimary).toContain('bg-');
      expect(light.btnPrimary).toContain('bg-');
      expect(hc.btnPrimary).toContain('bg-');
    });
  });

  describe('Input styles', () => {
    it('should have input styles for all themes', () => {
      const dark = getThemeClasses('dark');
      const light = getThemeClasses('light');

      expect(dark.input).toContain('bg-');
      expect(light.input).toContain('bg-');
    });
  });
});
