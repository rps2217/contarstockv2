import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for optimal className handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;

// =============================================================================
// THEME HELPERS
// =============================================================================

export type ThemeType = 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night' | undefined;

/**
 * Check if a theme is dark (for background/styling logic)
 */
export function isDarkMode(theme: ThemeType): boolean {
  if (!theme) return true;
  return ['dark', 'night', 'high-contrast', 'appsheet-dark', 'gray'].includes(theme);
}

/**
 * Check if a theme is light
 */
export function isLightMode(theme: ThemeType): boolean {
  return theme === 'light';
}