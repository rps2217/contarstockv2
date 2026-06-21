/**
 * useTheme - Hook para gestionar temas de la aplicación
 * 
 * Proporciona:
 * - Cambio de tema dinámico
 * - Persistencia en localStorage
 * - Detección de preferencia del sistema
 * - Temas personalizados de empresa
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// ============================================================
// TIPOS
// ============================================================

export type ThemeName = 'dark' | 'light' | 'high-contrast' | 'appsheet-dark';
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
  toggleTheme: () => void;
  cycleTheme: () => void;
}

// ============================================================
// CONSTANTES
// ============================================================

const THEMES: Theme[] = [
  { name: 'dark', label: 'Oscuro', icon: '🌙' },
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
      accent: '#f59e0b',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
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
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      border: '#334155',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Océano',
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
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [preset, setPresetState] = useState<ThemePreset>('default');
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [currentCustomTheme, setCurrentCustomTheme] = useState<CustomTheme | null>(null);

  // Cargar preferencias guardadas
  useEffect(() => {
    // Detectar preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    const savedPreset = localStorage.getItem(PRESET_KEY) as ThemePreset | null;
    const savedCustomThemes = localStorage.getItem(CUSTOM_THEMES_KEY);

    if (savedTheme) {
      setThemeState(savedTheme);
    } else if (!prefersDark) {
      setThemeState('light');
    }

    if (savedPreset) {
      setPresetState(savedPreset);
      if (PRESETS[savedPreset]) {
        setCurrentCustomTheme(PRESETS[savedPreset]);
      }
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
    document.documentElement.setAttribute('data-theme', theme);
    
    // Aplicar variables CSS personalizadas
    if (currentCustomTheme) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', currentCustomTheme.colors.primary);
      root.style.setProperty('--color-secondary', currentCustomTheme.colors.secondary);
      root.style.setProperty('--color-accent', currentCustomTheme.colors.accent);
    }
  }, [theme, currentCustomTheme]);

  // Escuchar cambios de preferencia del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (!savedTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

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
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const cycleTheme = useCallback(() => {
    const themeOrder: ThemeName[] = ['dark', 'light', 'high-contrast'];
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
      isDark: theme === 'dark',
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
