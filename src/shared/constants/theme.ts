/**
 * Theme Constants - Constantes centralizadas para estilos
 * 
 * Úsalas en lugar de valores hardcodeados para mantener consistencia.
 */

// ============================================
// COLORES
// ============================================

export const COLORS = {
  brand: {
    warning: '#F59E0B',
    accent: '#3B82F6',
    info: '#06B6D4',
    surface: '#1E293B',
    dark: '#0F172A',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  neutral: {
    slate: {
      50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0',
      300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B',
      600: '#475569', 700: '#334155', 800: '#1E293B',
      900: '#0F172A', 950: '#020617',
    },
  },
} as const;

// ============================================
// ANIMATIONS
// ============================================

export const ANIMATIONS = {
  durations: { fast: '150ms', normal: '300ms', slow: '500ms' },
  easings: { default: 'cubic-bezier(0.4, 0, 0.2, 1)', bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
} as const;

// ============================================
// SPACING
// ============================================

export const SPACING = {
  xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const TYPOGRAPHY = {
  fontFamily: { sans: 'ui-sans-serif, system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' },
} as const;

// ============================================
// BORDERS
// ============================================

export const BORDERS = {
  radius: { none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.5rem', full: '9999px' },
} as const;
