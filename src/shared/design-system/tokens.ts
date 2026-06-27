/**
 * Design Tokens - Sistema de variables CSS para la aplicación
 * 
 * Sistema de diseño monocromático inspirado en AppSheet/industrial
 * - Gris puro para modo oscuro
 * - Sin colores de acento (excepto estados mínimos)
 */

export const tokens = {
  // ============================================
  // COLORES - MODO OSCURO
  // ============================================
  dark: {
    bg: {
      base: '#0a0a0a',
      surface: '#141414',
      elevated: '#1f1f1f',
      overlay: '#262626',
    },
    text: {
      primary: '#fafafa',
      secondary: '#a3a3a3',
      muted: '#525252',
      inverse: '#0a0a0a',
    },
    border: {
      default: '#262626',
      subtle: '#1f1f1f',
      strong: '#404040',
    },
    interactive: {
      primary: '#262626',
      hover: '#333333',
      active: '#404040',
      disabled: '#1f1f1f',
    },
  },

  // ============================================
  // COLORES - MODO CLARO
  // ============================================
  light: {
    bg: {
      base: '#fafafa',
      surface: '#ffffff',
      elevated: '#f5f5f5',
      overlay: '#ffffff',
    },
    text: {
      primary: '#171717',
      secondary: '#525252',
      muted: '#a3a3a3',
      inverse: '#fafafa',
    },
    border: {
      default: '#e5e5e5',
      subtle: '#f0f0f0',
      strong: '#d4d4d4',
    },
    interactive: {
      primary: '#e5e5e5',
      hover: '#d4d4d4',
      active: '#a3a3a3',
      disabled: '#f0f0f0',
    },
  },

  // ============================================
  // ESPACIADO
  // ============================================
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  // ============================================
  // RADIOS
  // ============================================
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
} as const;

export type Theme = 'dark' | 'light';

// Helper para clases condicionales
export const cn = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Hook para obtener clases según el tema
export const useThemeClasses = (isDark: boolean) => {
  const t = isDark ? tokens.dark : tokens.light;
  
  return {
    // Backgrounds
    bg: {
      base: isDark ? 'bg-neutral-950' : 'bg-neutral-50',
      surface: isDark ? 'bg-neutral-900' : 'bg-white',
      elevated: isDark ? 'bg-neutral-800' : 'bg-neutral-100',
      overlay: isDark ? 'bg-neutral-800' : 'bg-white',
    },
    // Texto
    text: {
      primary: isDark ? 'text-neutral-100' : 'text-neutral-900',
      secondary: isDark ? 'text-neutral-400' : 'text-neutral-600',
      muted: isDark ? 'text-neutral-600' : 'text-neutral-400',
    },
    // Bordes
    border: {
      default: isDark ? 'border-neutral-800' : 'border-neutral-200',
      subtle: isDark ? 'border-neutral-900' : 'border-neutral-100',
      strong: isDark ? 'border-neutral-700' : 'border-neutral-300',
    },
    // Interactivo
    interactive: {
      primary: isDark ? 'bg-neutral-800' : 'bg-neutral-100',
      hover: isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200',
      active: isDark ? 'active:bg-neutral-600' : 'active:bg-neutral-300',
    },
  };
};
