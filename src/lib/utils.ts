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
// TEXT HELPERS
// =============================================================================

/**
 * Normalize text for search: uppercase, remove accents, trim
 * ponytail: Shared by suppliers, customers, inventory, reception domains
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// =============================================================================
// THEME HELPERS
// =============================================================================

// Lista de temas oscuros
const DARK_THEMES = ['dark', 'night', 'high-contrast', 'appsheet-dark', 'gray'] as const;
type DarkTheme = (typeof DARK_THEMES)[number];
type ThemeLike = DarkTheme | 'light' | undefined;

/**
 * Check if a theme is dark (for background/styling logic)
 * Uses type coercion to work with any theme prop type
 */
export function isDarkMode(theme: unknown): boolean {
  if (!theme) return true;
  return DARK_THEMES.includes(theme as DarkTheme);
}

/**
 * Check if a theme is light
 */
export function isLightMode(theme: unknown): boolean {
  return theme === 'light';
}

/**
 * Type-safe theme check for dark mode
 * Use this in components with specific theme prop types
 */
export function checkIsDark(theme: ThemeLike): boolean {
  return theme ? DARK_THEMES.includes(theme as DarkTheme) : true;
}
