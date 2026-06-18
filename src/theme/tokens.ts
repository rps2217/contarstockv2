/**
 * Design Tokens - Sistema de diseno unificado
 * Centraliza colores, espaciado, tipografia y sombras
 */

// ============================================
// COLORES
// ============================================
export const colors = {
  // Primarios
  primary: {
    DEFAULT: 'hsl(var(--color-primary))',
    foreground: 'hsl(var(--color-primary-foreground))',
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  
  // Secundarios
  secondary: {
    DEFAULT: 'hsl(var(--color-secondary))',
    foreground: 'hsl(var(--color-secondary-foreground))',
  },
  
  // Brand colors (usados en la app)
  brand: {
    info: '#3b82f6',      // Azul
    success: '#22c55e',   // Verde
    warning: '#f59e0b',   // Amber
    danger: '#ef4444',    // Rojo
    purple: '#8b5cf6',    // Violeta
  },
  
  // Status
  status: {
    synced: '#22c55e',
    pending: '#f59e0b',
    error: '#ef4444',
  },
  
  // Neutros
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  
  // Expiry status
  expiry: {
    expired: '#ef4444',
    critical: '#f97316',
    next_expiry: '#eab308',
    safe: '#22c55e',
  },
} as const;

// ============================================
// ESPACIADO (Tailwind-consistente)
// ============================================
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  8: '2rem',         // 32px
  10: '2.5rem',      // 40px
  12: '3rem',        // 48px
  16: '4rem',        // 64px
} as const;

// ============================================
// TIPOGRAFIA
// ============================================
export const typography = {
  // Familias
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'monospace'],
    display: ['Outfit', 'sans-serif'],
  },
  
  // Tamaños
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  
  // Pesos
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // Line heights
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

// ============================================
// SOMBRAS
// ============================================
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// ============================================
// BORDES
// ============================================
export const borders = {
  radius: {
    none: '0',
    sm: '0.125rem',    // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
  },
  
  width: {
    0: '0',
    1: '1px',
    2: '2px',
    4: '4px',
    8: '8px',
  },
} as const;

// ============================================
// ANIMACIONES
// ============================================
export const animations = {
  // Durations
  duration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // Easings
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Keyframes names
  keyframes: {
    spin: 'spin',
    ping: 'ping',
    pulse: 'pulse',
    bounce: 'bounce',
  },
} as const;

// ============================================
// Z-INDEX
// ============================================
export const zIndex = {
  dropdown: '10',
  sticky: '20',
  fixed: '30',
  'modal-backdrop': '40',
  modal: '50',
  popover: '60',
  tooltip: '70',
} as const;

// ============================================
// BREAKPOINTS
// ============================================
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// TOAST / NOTIFICACIONES
// ============================================
export const toast = {
  success: colors.brand.success,
  error: colors.brand.danger,
  warning: colors.brand.warning,
  info: colors.brand.info,
} as const;

// ============================================
// EXPORTACION COMPLETA
// ============================================
export const designTokens = {
  colors,
  spacing,
  typography,
  shadows,
  borders,
  animations,
  zIndex,
  breakpoints,
  toast,
} as const;

export default designTokens;
