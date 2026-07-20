import { logger } from '@/services/logger';
/**
 * ThemeService - Servicio para gestión de temas
 *
 * Proporciona una API simplificada para trabajar con temas.
 */

import type { ThemeName, ThemePreset, Theme, CustomTheme } from './useTheme';

// ============================================================================
// PRESETS DE TEMAS
// ============================================================================

export const THEME_PRESETS = {
  default: {
    id: 'default',
    name: 'Default',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryPressed: '#1d4ed8',
      success: '#22c55e',
      successSubtle: 'rgba(34, 197, 94, 0.1)',
      warning: '#f59e0b',
      warningSubtle: 'rgba(245, 158, 11, 0.1)',
      error: '#ef4444',
      errorSubtle: 'rgba(239, 68, 68, 0.1)',
      info: '#06b6d4',
      infoSubtle: 'rgba(6, 182, 212, 0.1)',
      background: '#0A0A0B',
      backgroundSubtle: '#09090b',
      surface: '#18181B',
      surfaceHover: '#27272a',
      text: '#FAFAFA',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
      border: '#27272a',
      borderSubtle: 'rgba(255, 255, 255, 0.05)',
    },
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate',
    colors: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryPressed: '#1e40af',
      success: '#16a34a',
      successSubtle: 'rgba(22, 163, 74, 0.1)',
      warning: '#ca8a04',
      warningSubtle: 'rgba(202, 138, 4, 0.1)',
      error: '#dc2626',
      errorSubtle: 'rgba(220, 38, 38, 0.1)',
      info: '#0891b2',
      infoSubtle: 'rgba(8, 145, 178, 0.1)',
      background: '#f8fafc',
      backgroundSubtle: '#f1f5f9',
      surface: '#ffffff',
      surfaceHover: '#f8fafc',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      border: '#e2e8f0',
      borderSubtle: 'rgba(0, 0, 0, 0.05)',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primaryPressed: '#0369a1',
      success: '#10b981',
      successSubtle: 'rgba(16, 185, 129, 0.1)',
      warning: '#f59e0b',
      warningSubtle: 'rgba(245, 158, 11, 0.1)',
      error: '#ef4444',
      errorSubtle: 'rgba(239, 68, 68, 0.1)',
      info: '#06b6d4',
      infoSubtle: 'rgba(6, 182, 212, 0.1)',
      background: '#0c4a6e',
      backgroundSubtle: '#082f49',
      surface: '#0c4a6e',
      surfaceHover: '#155e75',
      text: '#f0f9ff',
      textSecondary: '#7dd3fc',
      textMuted: '#38bdf8',
      border: '#0ea5e9',
      borderSubtle: 'rgba(14, 165, 233, 0.2)',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      primaryPressed: '#15803d',
      success: '#22c55e',
      successSubtle: 'rgba(34, 197, 94, 0.1)',
      warning: '#f59e0b',
      warningSubtle: 'rgba(245, 158, 11, 0.1)',
      error: '#ef4444',
      errorSubtle: 'rgba(239, 68, 68, 0.1)',
      info: '#06b6d4',
      infoSubtle: 'rgba(6, 182, 212, 0.1)',
      background: '#14532d',
      backgroundSubtle: '#052e16',
      surface: '#166534',
      surfaceHover: '#15803d',
      text: '#f0fdf4',
      textSecondary: '#86efac',
      textMuted: '#4ade80',
      border: '#22c55e',
      borderSubtle: 'rgba(34, 197, 94, 0.2)',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryPressed: '#c2410c',
      success: '#22c55e',
      successSubtle: 'rgba(34, 197, 94, 0.1)',
      warning: '#eab308',
      warningSubtle: 'rgba(234, 179, 8, 0.1)',
      error: '#ef4444',
      errorSubtle: 'rgba(239, 68, 68, 0.1)',
      info: '#f472b6',
      infoSubtle: 'rgba(244, 114, 182, 0.1)',
      background: '#7c2d12',
      backgroundSubtle: '#431407',
      surface: '#9a3412',
      surfaceHover: '#c2410c',
      text: '#fff7ed',
      textSecondary: '#fed7aa',
      textMuted: '#fdba74',
      border: '#f97316',
      borderSubtle: 'rgba(249, 115, 22, 0.2)',
    },
  },
  night: {
    id: 'night',
    name: 'Night Steel',
    colors: {
      primary: '#6b8cae',
      primaryHover: '#7a9bbf',
      primaryPressed: '#5a7a9d',
      success: '#4ade80',
      successSubtle: 'rgba(74, 222, 128, 0.12)',
      warning: '#fbbf24',
      warningSubtle: 'rgba(251, 191, 36, 0.12)',
      error: '#f87171',
      errorSubtle: 'rgba(248, 113, 113, 0.12)',
      info: '#38bdf8',
      infoSubtle: 'rgba(56, 189, 248, 0.12)',
      background: '#0a0a0b',
      backgroundSubtle: '#09090b',
      surface: '#18181b',
      surfaceHover: '#1f1f23',
      text: '#fafafa',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
      border: '#27272a',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
    },
  },
  gray: {
    id: 'gray',
    name: 'Gris Pro',
    colors: {
      primary: '#94a3b8',
      primaryHover: '#a5b4c4',
      primaryPressed: '#8494a8',
      success: '#34d399',
      successSubtle: 'rgba(52, 211, 153, 0.12)',
      warning: '#fbbf24',
      warningSubtle: 'rgba(251, 191, 36, 0.12)',
      error: '#f87171',
      errorSubtle: 'rgba(248, 113, 113, 0.12)',
      info: '#22d3ee',
      infoSubtle: 'rgba(34, 211, 238, 0.12)',
      background: '#121214',
      backgroundSubtle: '#0d0d0f',
      surface: '#1e1e24',
      surfaceHover: '#28282f',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      border: '#32323a',
      borderSubtle: 'rgba(255, 255, 255, 0.04)',
    },
  },
} as const;

// ============================================================================
// TEMAS BASE (para selector de UI)
// ============================================================================

export const THEMES: Theme[] = [
  { name: 'dark', label: 'Oscuro', icon: '🌙', preset: 'default' },
  { name: 'light', label: 'Claro', icon: '☀️', preset: 'corporate' },
  { name: 'night', label: 'Noche', icon: '🌑', preset: 'default' },
  { name: 'gray', label: 'Gris', icon: '🌫️', preset: 'default' },
  { name: 'high-contrast', label: 'Alto Contraste', icon: '🔳', preset: 'default' },
  { name: 'appsheet-dark', label: 'AppSheet', icon: '📱', preset: 'default' },
];

// ============================================================================
// HELPERS
// ============================================================================

export function isDarkTheme(theme: ThemeName): boolean {
  return ['dark', 'night', 'high-contrast', 'appsheet-dark', 'gray'].includes(theme);
}

export function isLightTheme(theme: ThemeName): boolean {
  return theme === 'light';
}

export function isHighContrast(theme: ThemeName): boolean {
  return theme === 'high-contrast';
}

// ============================================================================
// CSS VARIABLE INJECTOR
// ============================================================================

export function injectThemeCSS(colors: Record<string, string>): void {
  const root = document.documentElement;

  // Limpiar variables existentes
  Object.keys(colors).forEach(key => {
    root.style.removeProperty(`--color-${key}`);
  });

  // Aplicar nuevas variables
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

export function resetThemeCSS(): void {
  const defaultColors = THEME_PRESETS.default.colors;
  injectThemeCSS(defaultColors);
}

// ============================================================================
// THEME STORAGE
// ============================================================================

export const THEME_STORAGE_KEY = 'contarstock-theme';
export const CUSTOM_THEMES_KEY = 'contarstock-custom-themes';

export function saveThemeToStorage(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e: unknown) {
    logger.warn(
      'ThemeService',
      'Failed to save theme to storage',
      e instanceof Error ? e.message : String(e)
    );
  }
}

export function loadThemeFromStorage(): ThemeName | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
  } catch (e: unknown) {
    logger.warn(
      'ThemeService',
      'Failed to load theme from storage',
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

export function saveCustomThemesToStorage(themes: CustomTheme[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch (e: unknown) {
    logger.warn(
      'ThemeService',
      'Failed to save custom themes to storage',
      e instanceof Error ? e.message : String(e)
    );
  }
}

export function loadCustomThemesFromStorage(): CustomTheme[] {
  try {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e: unknown) {
    logger.warn(
      'ThemeService',
      'Failed to load custom themes from storage',
      e instanceof Error ? e.message : String(e)
    );
    return [];
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  THEMES,
  THEME_PRESETS,
  isDarkTheme,
  isLightTheme,
  isHighContrast,
  injectThemeCSS,
  resetThemeCSS,
  saveThemeToStorage,
  loadThemeFromStorage,
  saveCustomThemesToStorage,
  loadCustomThemesFromStorage,
};
