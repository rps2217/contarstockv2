/**
 * useAppSheetTheme - Hook para el tema AppSheet Dark
 * 
 * Proporciona acceso a las variables CSS del tema
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'appsheet-dark' | 'appsheet-light' | 'current';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isAppSheet: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useAppSheetTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppSheetTheme must be used within AppSheetThemeProvider');
  }
  return context;
};

interface AppSheetThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export const AppSheetThemeProvider: React.FC<AppSheetThemeProviderProps> = ({
  children,
  defaultMode = 'current'
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Cargar del localStorage
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || defaultMode;
  });

  useEffect(() => {
    // Guardar en localStorage
    localStorage.setItem('theme-mode', mode);
    
    // Aplicar clase al body
    document.body.classList.remove('appsheet-dark', 'appsheet-light');
    if (mode !== 'current') {
      document.body.classList.add(mode);
    }
  }, [mode]);

  const value: ThemeContextValue = {
    mode,
    setMode,
    isAppSheet: mode === 'appsheet-dark' || mode === 'appsheet-light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Paleta de colores para uso directo
export const AppSheetColors = {
  // Backgrounds
  bg: {
    base: 'var(--appsheet-bg-base)',
    elevated: 'var(--appsheet-bg-elevated)',
    surface: 'var(--appsheet-bg-surface)',
    card: 'var(--appsheet-bg-card)',
    hover: 'var(--appsheet-bg-hover)',
    active: 'var(--appsheet-bg-active)',
  },
  // Borders
  border: {
    subtle: 'var(--appsheet-border-subtle)',
    default: 'var(--appsheet-border-default)',
    strong: 'var(--appsheet-border-strong)',
    focus: 'var(--appsheet-border-focus)',
  },
  // Text
  text: {
    primary: 'var(--appsheet-text-primary)',
    secondary: 'var(--appsheet-text-secondary)',
    tertiary: 'var(--appsheet-text-tertiary)',
    disabled: 'var(--appsheet-text-disabled)',
  },
  // Accent
  accent: {
    primary: 'var(--appsheet-accent-primary)',
    hover: 'var(--appsheet-accent-hover)',
    subtle: 'var(--appsheet-accent-subtle)',
  },
  // Semantic
  semantic: {
    success: 'var(--appsheet-success)',
    successSubtle: 'var(--appsheet-success-subtle)',
    warning: 'var(--appsheet-warning)',
    warningSubtle: 'var(--appsheet-warning-subtle)',
    error: 'var(--appsheet-error)',
    errorSubtle: 'var(--appsheet-error-subtle)',
    info: 'var(--appsheet-info)',
    infoSubtle: 'var(--appsheet-info-subtle)',
  },
};

// Clases Tailwind predefinidas para el tema AppSheet
export const AppSheetClasses = {
  // Containers
  container: 'bg-[var(--appsheet-bg-base)] text-[var(--appsheet-text-primary)]',
  surface: 'bg-[var(--appsheet-bg-surface)] border border-[var(--appsheet-border-subtle)]',
  card: 'bg-[var(--appsheet-bg-surface)] border border-[var(--appsheet-border-subtle)] rounded-xl',
  cardHover: 'hover:bg-[var(--appsheet-bg-card)] hover:border-[var(--appsheet-border-default)]',
  
  // Text
  textPrimary: 'text-[var(--appsheet-text-primary)]',
  textSecondary: 'text-[var(--appsheet-text-secondary)]',
  textTertiary: 'text-[var(--appsheet-text-tertiary)]',
  textAccent: 'text-[var(--appsheet-accent-primary)]',
  
  // Buttons
  btnPrimary: 'bg-[var(--appsheet-accent-primary)] text-[var(--appsheet-text-inverse)] hover:bg-[var(--appsheet-accent-hover)]',
  btnSecondary: 'bg-[var(--appsheet-bg-card)] text-[var(--appsheet-text-primary)] border border-[var(--appsheet-border-default)] hover:bg-[var(--appsheet-bg-hover)]',
  btnGhost: 'bg-transparent text-[var(--appsheet-text-secondary)] hover:bg-[var(--appsheet-bg-hover)] hover:text-[var(--appsheet-text-primary)]',
  btnDanger: 'bg-[var(--appsheet-error)] text-white hover:bg-red-500',
  
  // Inputs
  inputBase: 'bg-[var(--appsheet-bg-elevated)] border border-[var(--appsheet-border-default)] text-[var(--appsheet-text-primary)] placeholder:text-[var(--appsheet-text-tertiary)] focus:border-[var(--appsheet-border-focus)] focus:ring-2 focus:ring-[var(--appsheet-accent-subtle)]',
  inputError: 'border-[var(--appsheet-error)] focus:ring-[var(--appsheet-error-subtle)]',
  inputSuccess: 'border-[var(--appsheet-success)] focus:ring-[var(--appsheet-success-subtle)]',
  
  // Badges
  badgeDefault: 'bg-[var(--appsheet-bg-card)] text-[var(--appsheet-text-secondary)] border border-[var(--appsheet-border-default)]',
  badgePrimary: 'bg-[var(--appsheet-accent-subtle)] text-[var(--appsheet-accent-primary)]',
  badgeSuccess: 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)]',
  badgeWarning: 'bg-[var(--appsheet-warning-subtle)] text-[var(--appsheet-warning)]',
  badgeError: 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)]',
  
  // Dividers
  divider: 'bg-[var(--appsheet-border-subtle)]',
  
  // Interactive
  interactive: 'hover:bg-[var(--appsheet-bg-hover)] active:bg-[var(--appsheet-bg-active)]',
};

export default AppSheetThemeProvider;
