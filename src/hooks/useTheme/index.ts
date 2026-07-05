/**
 * useTheme - Exports centralizados
 */

export { 
  useTheme, 
  ThemeProvider,
  isDarkTheme,
  isGrayTheme,
  isNightTheme,
} from './useTheme';

export type {
  ThemeName,
  ThemePreset,
  Theme,
  CustomTheme,
} from './useTheme';

// Re-export desde ThemeService
export {
  THEMES,
  THEME_PRESETS,
  isDarkTheme as checkIsDark,
  isLightTheme,
  isHighContrast,
  injectThemeCSS,
  resetThemeCSS,
  saveThemeToStorage,
  loadThemeFromStorage,
  saveCustomThemesToStorage,
  loadCustomThemesFromStorage,
  THEME_STORAGE_KEY,
  CUSTOM_THEMES_KEY,
} from './ThemeService';

export { default as ThemeService } from './ThemeService';