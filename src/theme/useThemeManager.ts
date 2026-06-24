/**
 * useThemeManager - Hook para acceder al ThemeManager
 * 
 * Proporciona acceso reactivo a:
 * - Tema actual (mode, scheme)
 * - Paleta de colores
 * - Helpers para clases CSS
 */

import { useContext } from 'react';
import { ThemeContext, ThemeMode, ThemeScheme, ThemeColors } from './ThemeManager';

// ============================================================================
// TIPOS
// ============================================================================

export interface UseThemeManagerReturn {
  // Estado
  mode: ThemeMode;
  scheme: ThemeScheme;
  
  // Helpers de estado
  isDark: boolean;
  isLight: boolean;
  isHighContrast: boolean;
  
  // Colores
  colors: ThemeColors;
  
  // Acciones
  setMode: (mode: ThemeMode) => void;
  setScheme: (scheme: ThemeScheme) => void;
  toggleMode: () => void;
  
  // Utilities
  getColor: (path: string) => string;
  getClass: (classes: Record<ThemeMode, string>) => string;
  cssVar: (name: string) => string;
  
  // Helpers rápidos
  bg: keyof Pick<ThemeColors, 'bgBase' | 'bgElevated' | 'bgSurface' | 'bgCard' | 'bgHover' | 'bgActive' | 'bgSearch'>;
  text: keyof Pick<ThemeColors, 'textPrimary' | 'textSecondary' | 'textTertiary' | 'textDisabled' | 'textInverse'>;
  semantic: keyof Pick<ThemeColors, 'success' | 'warning' | 'error' | 'info'>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useThemeManager(): UseThemeManagerReturn {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useThemeManager must be used within ThemeProvider');
  }
  
  return {
    // Estado
    mode: context.mode,
    scheme: context.scheme,
    isDark: context.isDark,
    isLight: context.isLight,
    isHighContrast: context.isHighContrast,
    
    // Colores
    colors: context.colors,
    
    // Acciones
    setMode: context.setMode,
    setScheme: context.setScheme,
    toggleMode: context.toggleMode,
    
    // Utilities
    getColor: context.getColor,
    getClass: context.getClass,
    cssVar: context.getCSSVariable,
    
    // Helpers rápidos (uso: theme.bg.bgBase)
    bg: {} as any,
    text: {} as any,
    semantic: {} as any,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook para acceder solo a los colores
 */
export function useThemeColors(): ThemeColors {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeColors must be used within ThemeProvider');
  }
  return context.colors;
}

/**
 * Hook para verificar el modo actual
 */
export function useThemeMode(): { 
  isDark: boolean; 
  isLight: boolean; 
  isHighContrast: boolean;
  mode: ThemeMode;
} {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return {
    isDark: context.isDark,
    isLight: context.isLight,
    isHighContrast: context.isHighContrast,
    mode: context.mode
  };
}

/**
 * Hook para obtener una clase CSS condicional por tema
 */
export function useThemedClass(): (classes: Record<ThemeMode, string>) => string {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemedClass must be used within ThemeProvider');
  }
  return context.getClass;
}

// ============================================================================
// PRESET HOOKS
// ============================================================================

/**
 * Hook para trabajar con backgrounds
 */
export function useThemeBackground() {
  const colors = useThemeColors();
  const mode = useThemeMode();
  
  return {
    base: mode.isDark ? colors.bgBase : mode.isLight ? '#ffffff' : colors.bgBase,
    elevated: colors.bgElevated,
    surface: colors.bgSurface,
    card: colors.bgCard,
    hover: colors.bgHover,
    active: colors.bgActive,
    search: colors.bgSearch,
    
    // Clases CSS
    baseClass: mode.isDark ? 'bg-[#0f0f0f]' : mode.isLight ? 'bg-white' : 'bg-black',
    surfaceClass: mode.isDark ? 'bg-[#252525]' : mode.isLight ? 'bg-zinc-50' : 'bg-[#141414]',
    cardClass: mode.isDark ? 'bg-[#2d2d2d]' : mode.isLight ? 'bg-white' : 'bg-[#1a1a1a]',
  };
}

/**
 * Hook para trabajar con textos
 */
export function useThemeText() {
  const colors = useThemeColors();
  const mode = useThemeMode();
  
  return {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    disabled: colors.textDisabled,
    
    // Clases CSS
    primaryClass: mode.isDark ? 'text-[#f0f0f0]' : mode.isLight ? 'text-zinc-900' : 'text-white',
    secondaryClass: mode.isDark ? 'text-[#a1a1aa]' : mode.isLight ? 'text-zinc-600' : 'text-[#e5e5e5]',
    disabledClass: mode.isDark ? 'text-[#52525b]' : mode.isLight ? 'text-zinc-400' : 'text-[#888888]',
  };
}

/**
 * Hook para trabajar con bordes
 */
export function useThemeBorder() {
  const colors = useThemeColors();
  const mode = useThemeMode();
  
  return {
    subtle: colors.borderSubtle,
    default: colors.borderDefault,
    strong: colors.borderStrong,
    focus: colors.borderFocus,
    
    // Clases CSS
    subtleClass: mode.isDark ? 'border-[rgba(255,255,255,0.08)]' : mode.isLight ? 'border-[rgba(0,0,0,0.06)]' : 'border-[rgba(255,255,255,0.20)]',
    defaultClass: mode.isDark ? 'border-[rgba(255,255,255,0.12)]' : mode.isLight ? 'border-zinc-200' : 'border-[rgba(255,255,255,0.30)]',
    focusClass: mode.isDark ? 'focus:border-[rgba(138,180,248,0.50)]' : mode.isLight ? 'focus:border-blue-500' : 'focus:border-yellow-400',
  };
}

/**
 * Hook para trabajar con estados semánticos (success/error/warning)
 */
export function useThemeSemantic() {
  const colors = useThemeColors();
  
  return {
    success: colors.success,
    successSubtle: colors.successSubtle,
    warning: colors.warning,
    warningSubtle: colors.warningSubtle,
    error: colors.error,
    errorSubtle: colors.errorSubtle,
    info: colors.info,
    infoSubtle: colors.infoSubtle,
  };
}

/**
 * Hook para trabajar con colores de estado de vencimientos
 */
export function useThemeExpiry() {
  const colors = useThemeColors();
  
  return {
    expired: colors.expired,
    critical: colors.critical,
    withdrawal: colors.withdrawal,
    nextExpiry: colors.nextExpiry,
    safe: colors.safe,
  };
}
