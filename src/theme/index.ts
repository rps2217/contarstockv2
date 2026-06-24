/**
 * Theme Utilities - Helper para aplicar tokens en componentes
 */
import { designTokens, colors, spacing, typography, shadows, borders, animations, zIndex } from './tokens';

// ============================================
// CLASES UTILITARIAS
// ============================================

/**
 * Genera clases de color para status badges
 */
export const statusClasses = {
  synced: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
} as const;

/**
 * Genera clases para estado de expiry
 */
export const expiryStatusClasses = {
  expired: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-orange-100 text-orange-800 border-orange-200',
  next_expiry: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  safe: 'bg-green-100 text-green-800 border-green-200',
} as const;

/**
 * Clases para prioridades
 */
export const priorityClasses = {
  low: 'text-slate-500',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
} as const;

/**
 * Tamaños de botones
 */
export const buttonSizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

/**
 * Tamaños de inputs
 */
export const inputSizes = {
  sm: 'h-8 px-2 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
} as const;

/**
 * Variantes de botones
 */
export const buttonVariants = {
  primary: 'bg-brand-info text-white hover:bg-blue-600',
  secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50',
} as const;

/**
 * Clases de card
 */
export const cardClasses = {
  base: 'bg-white rounded-lg shadow-md border border-slate-200',
  elevated: 'bg-white rounded-xl shadow-lg',
  flat: 'bg-slate-50 rounded-lg',
} as const;

// ============================================
// FUNCIONES HELPER
// ============================================

/**
 * Obtiene clase de color basada en sync status
 */
export function getSyncStatusClass(status: 'synced' | 'pending' | 'error'): string {
  return statusClasses[status] ?? statusClasses.pending;
}

/**
 * Obtiene clase de color basada en expiry status
 */
export function getExpiryStatusClass(status: 'expired' | 'critical' | 'next_expiry' | 'safe'): string {
  return expiryStatusClasses[status] ?? 'bg-slate-100 text-slate-800';
}

/**
 * Obtiene clase de prioridad
 */
export function getPriorityClass(priority: 'low' | 'medium' | 'high' | 'critical'): string {
  return priorityClasses[priority] ?? priorityClasses.low;
}

/**
 * Combina clases condicionalmente
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// ICONOS DE STATUS
// ============================================

export const statusIcons = {
  synced: '✓',
  pending: '◐',
  error: '✗',
} as const;

/**
 * Obtiene icono de status
 */
export function getStatusIcon(status: 'synced' | 'pending' | 'error'): string {
  return statusIcons[status] ?? statusIcons.pending;
}

// ============================================
// RE-EXPORT
// ============================================
export { designTokens, colors, spacing, typography, shadows, borders, animations, zIndex };

// ============================================
// THEME MANAGER ( NUEVO SISTEMA)
// ============================================
export {
  ThemeProvider,
  useTheme,
  getThemeClasses,
  cnTheme,
  ThemedSurface,
  ThemedCard,
  ThemedButton,
  ThemedInput,
  type ThemeMode,
  type ThemeScheme,
  type ThemeColors,
  type ThemeTokens
} from './ThemeManager';

export { useThemeManager } from './useThemeManager';
export { ThemeSwitcher } from './components/ThemeSwitcher';
