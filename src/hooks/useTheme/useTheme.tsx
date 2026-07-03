/**
 * useTheme - Hook para gestionar temas de la aplicación
 * 
 * Proporciona:
 * - Cambio de tema dinámico
 * - Persistencia en settings store
 * - Detección de preferencia del sistema
 * - Temas: night (oscuro), gray (gris claro), light (blanco), high-contrast
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useSettingsStore } from '@/features/settings/store';

// ============================================================
// TIPOS
// ============================================================

export type ThemeName = 'dark' | 'light' | 'high-contrast' | 'appsheet-dark' | 'gray' | 'night';
export type ThemePreset = 'default' | 'corporate' | 'ocean' | 'forest' | 'sunset';

export interface Theme {
  name: ThemeName;
  preset?: ThemePreset;
  label: string;
  icon: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    border: string;
  };
}

interface ThemeContextType {
  theme: ThemeName;
  preset: ThemePreset;
  customThemes: CustomTheme[];
  currentCustomTheme: CustomTheme | null;
  setTheme: (theme: ThemeName) => void;
  setPreset: (preset: ThemePreset) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  applyCustomTheme: (theme: CustomTheme) => void;
  isDark: boolean;
  isGray: boolean;
  isNight: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

// ============================================================
// HELPERS
// ============================================================

export function isDarkTheme(theme: ThemeName): boolean {
  return (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
}

export function isGrayTheme(theme: ThemeName): boolean {
  return theme === 'gray';
}

export function isNightTheme(theme: ThemeName): boolean {
  return theme === 'night';
}

// ============================================================
// CONSTANTES
// ============================================================

const THEMES: Theme[] = [
  { name: 'night', label: 'Noche', icon: '🌙' },
  { name: 'gray', label: 'Gris', icon: '🌫️' },
  { name: 'light', label: 'Claro', icon: '☀️' },
  { name: 'high-contrast', label: 'Alto Contraste', icon: '🔳' },
];

const PRESETS: Record<ThemePreset, CustomTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#6B8CAE',
      background: '#0A0A0B',
      surface: '#18181B',
      text: '#FAFAFA',
      border: '#334155',
    },
  },
  corporate: {
    id: 'corporate',
    name: 'Corporativo',
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#0d9488',
      background: '#0A0A0B',
      surface: '#18181B',
      text: '#FAFAFA',
      border: '#334155',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Oceano',
    colors: {
      primary: '#06b6d4',
      secondary: '#0ea5e9',
      accent: '#14b8a6',
      background: '#0c4a6e',
      surface: '#0e7490',
      text: '#f0f9ff',
      border: '#38bdf8',
    },
  },
  forest: {
    id: 'forest',
    name: 'Bosque',
    colors: {
      primary: '#22c55e',
      secondary: '#16a34a',
      accent: '#eab308',
      background: '#14532d',
      surface: '#166534',
      text: '#f0fdf4',
      border: '#4ade80',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Atardecer',
    colors: {
      primary: '#f97316',
      secondary: '#ef4444',
      accent: '#eab308',
      background: '#7c2d12',
      surface: '#9a3412',
      text: '#fef2f2',
      border: '#fb923c',
    },
  },
};

const STORAGE_KEY = 'app-theme';
const PRESET_KEY = 'app-theme-preset';
const CUSTOM_THEMES_KEY = 'app-custom-themes';

// ============================================================
// CONTEXTO
// ============================================================

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Usar settings store para persistencia
  const { settings, updateSetting } = useSettingsStore();
  
  // Estado local para el preset y custom themes
  const [preset, setPresetState] = useState<ThemePreset>('default');
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [currentCustomTheme, setCurrentCustomTheme] = useState<CustomTheme | null>(null);

  // Obtener tema del settings
  const theme = (settings.theme as ThemeName) || 'night';

  // Cargar preferencias guardadas
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Cargar preset
    const savedPreset = localStorage.getItem(PRESET_KEY) as ThemePreset | null;
    const savedCustomThemes = localStorage.getItem(CUSTOM_THEMES_KEY);

    if (savedPreset && PRESETS[savedPreset]) {
      setPresetState(savedPreset);
      setCurrentCustomTheme(PRESETS[savedPreset]);
    }

    if (savedCustomThemes) {
      try {
        setCustomThemes(JSON.parse(savedCustomThemes));
      } catch (e) {
        console.warn('Error parsing custom themes:', e);
      }
    }
  }, []);

  // Aplicar tema al documento
  useEffect(() => {
    // Usar el tema de settings store
    document.documentElement.setAttribute('data-theme', theme);

    // Aplicar variables CSS personalizadas del preset
    if (currentCustomTheme) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', currentCustomTheme.colors.primary);
      root.style.setProperty('--color-secondary', currentCustomTheme.colors.secondary);
      root.style.setProperty('--color-accent', currentCustomTheme.colors.accent);
    } else {
      // Aplicar colores según el tema base
      const root = document.documentElement;
      
      if (isDarkTheme(theme)) {
        root.style.setProperty('--color-accent', '#6B8CAE');
      } else {
        root.style.setProperty('--color-accent', '#2563EB');
      }
    }
  }, [theme, currentCustomTheme]);

  // Escuchar cambios de preferencia del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (!savedTheme) {
        // Solo cambiar si no hay tema guardado
        const newTheme = e.matches ? 'dark' : 'light';
        updateSetting('theme', newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [updateSetting]);

  // Sincronizar con settings store
  const setTheme = useCallback((newTheme: ThemeName) => {
    // Guardar en localStorage también
    localStorage.setItem(STORAGE_KEY, newTheme);
    // Actualizar settings store
    updateSetting('theme', newTheme);
  }, [updateSetting]);

  const setPreset = useCallback((newPreset: ThemePreset) => {
    setPresetState(newPreset);
    setCurrentCustomTheme(PRESETS[newPreset]);
    localStorage.setItem(PRESET_KEY, newPreset);
  }, []);

  const addCustomTheme = useCallback((newTheme: CustomTheme) => {
    setCustomThemes(prev => {
      const updated = [...prev, newTheme];
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeCustomTheme = useCallback((id: string) => {
    setCustomThemes(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
      return updated;
    });

    if (currentCustomTheme?.id === id) {
      setCurrentCustomTheme(PRESETS.default);
    }
  }, [currentCustomTheme]);

  const applyCustomTheme = useCallback((newTheme: CustomTheme) => {
    setCurrentCustomTheme(newTheme);
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify([...customThemes, newTheme]));
  }, [customThemes]);

  const toggleTheme = useCallback(() => {
    // Cycle through: night -> gray -> light -> night
    const order: ThemeName[] = ['night', 'gray', 'light'];
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  }, [theme, setTheme]);

  const cycleTheme = useCallback(() => {
    const themeOrder: ThemeName[] = ['night', 'gray', 'light', 'high-contrast'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      preset,
      customThemes,
      currentCustomTheme,
      setTheme,
      setPreset,
      addCustomTheme,
      removeCustomTheme,
      applyCustomTheme,
      isDark: isDarkTheme(theme),
      isGray: isGrayTheme(theme),
      isNight: isNightTheme(theme),
      toggleTheme,
      cycleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// ============================================================
// EXPORTS
// ============================================================

export { THEMES, PRESETS };
