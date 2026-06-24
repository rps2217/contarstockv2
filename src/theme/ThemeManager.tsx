/**
 * ThemeManager - Sistema centralizado de gestión de temas visuales
 * 
 * Proporciona:
 * - Tokens de diseño unificados
 * - Hooks para acceso reactivo al tema
 * - Utilities para clases condicionales
 * - Componentes base estilizados
 * - Sistema de temas múltiples (dark/light/high-contrast)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'high-contrast';
export type ThemeScheme = 'appsheet' | 'noche-gray' | 'industrial';

interface ThemeColors {
  // Backgrounds
  bgBase: string;
  bgElevated: string;
  bgSurface: string;
  bgCard: string;
  bgHover: string;
  bgActive: string;
  bgSearch: string;
  
  // Borders
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderFocus: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;
  
  // Primary/Accent
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  primarySubtle: string;
  
  // Semantic
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  error: string;
  errorSubtle: string;
  info: string;
  infoSubtle: string;
  
  // Expiry status
  expired: string;
  critical: string;
  withdrawal: string;
  nextExpiry: string;
  safe: string;
}

interface ThemeTokens {
  colors: ThemeColors;
  mode: ThemeMode;
  scheme: ThemeScheme;
  isDark: boolean;
  isHighContrast: boolean;
}

interface ThemeContextValue {
  // Estado actual
  mode: ThemeMode;
  scheme: ThemeScheme;
  
  // Helpers
  isDark: boolean;
  isHighContrast: boolean;
  isLight: boolean;
  
  // Tokens
  colors: ThemeColors;
  
  // Esquemas personalizados
  customColors: Partial<ThemeColors>;
  setCustomColors: (colors: Partial<ThemeColors>) => void;
  updateCustomColor: (key: keyof ThemeColors, value: string) => void;
  resetCustomColors: () => void;
  
  // Acciones
  setMode: (mode: ThemeMode) => void;
  setScheme: (scheme: ThemeScheme) => void;
  toggleMode: () => void;
  
  // Utilities
  getColor: (path: string) => string;
  getClass: (classes: { dark?: string; light?: string; 'high-contrast'?: string }) => string;
  
  // CSS Variables
  getCSSVariable: (name: string) => string;
  applyTheme: () => void;
}

// ============================================================================
// PALETAS DE COLORES
// ============================================================================

const THEME_PALETTES: Record<ThemeMode, ThemeColors> = {
  dark: {
    // Backgrounds
    bgBase: '#0f0f0f',
    bgElevated: '#1a1a1a',
    bgSurface: '#252525',
    bgCard: '#2d2d2d',
    bgHover: 'rgba(255, 255, 255, 0.06)',
    bgActive: 'rgba(255, 255, 255, 0.10)',
    bgSearch: '#353535',
    
    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderDefault: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.20)',
    borderFocus: 'rgba(138, 180, 248, 0.50)',
    
    // Text
    textPrimary: '#f0f0f0',
    textSecondary: '#a1a1aa',
    textTertiary: '#71717a',
    textDisabled: '#52525b',
    textInverse: '#000000',
    
    // Primary/Accent (AppSheet Blue)
    primary: '#8AB4F8',
    primaryHover: '#AECBFA',
    primaryPressed: '#669DF6',
    primarySubtle: 'rgba(138, 180, 248, 0.12)',
    
    // Semantic
    success: '#4ADE80',
    successSubtle: 'rgba(74, 222, 128, 0.12)',
    warning: '#FBBF24',
    warningSubtle: 'rgba(251, 191, 36, 0.12)',
    error: '#F87171',
    errorSubtle: 'rgba(248, 113, 113, 0.12)',
    info: '#60A5FA',
    infoSubtle: 'rgba(96, 165, 250, 0.12)',
    
    // Expiry status
    expired: '#ef4444',
    critical: '#f97316',
    withdrawal: '#fb923c',
    nextExpiry: '#eab308',
    safe: '#22c55e',
  },
  
  light: {
    // Backgrounds
    bgBase: '#ffffff',
    bgElevated: '#f4f4f5',
    bgSurface: '#fafafa',
    bgCard: '#ffffff',
    bgHover: 'rgba(0, 0, 0, 0.04)',
    bgActive: 'rgba(0, 0, 0, 0.08)',
    bgSearch: '#f4f4f5',
    
    // Borders
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    borderDefault: 'rgba(0, 0, 0, 0.10)',
    borderStrong: 'rgba(0, 0, 0, 0.15)',
    borderFocus: 'rgba(37, 99, 235, 0.50)',
    
    // Text
    textPrimary: '#18181b',
    textSecondary: '#52525b',
    textTertiary: '#71717a',
    textDisabled: '#a1a1aa',
    textInverse: '#ffffff',
    
    // Primary/Accent
    primary: '#2563eb',
    primaryHover: '#3b82f6',
    primaryPressed: '#1d4ed8',
    primarySubtle: 'rgba(37, 99, 235, 0.08)',
    
    // Semantic
    success: '#16a34a',
    successSubtle: 'rgba(22, 163, 74, 0.08)',
    warning: '#d97706',
    warningSubtle: 'rgba(217, 119, 6, 0.08)',
    error: '#dc2626',
    errorSubtle: 'rgba(220, 38, 38, 0.08)',
    info: '#2563eb',
    infoSubtle: 'rgba(37, 99, 235, 0.08)',
    
    // Expiry status
    expired: '#dc2626',
    critical: '#ea580c',
    withdrawal: '#f97316',
    nextExpiry: '#ca8a04',
    safe: '#16a34a',
  },
  
  'high-contrast': {
    // Backgrounds
    bgBase: '#000000',
    bgElevated: '#0a0a0a',
    bgSurface: '#141414',
    bgCard: '#1a1a1a',
    bgHover: 'rgba(255, 255, 255, 0.10)',
    bgActive: 'rgba(255, 255, 255, 0.15)',
    bgSearch: '#1f1f1f',
    
    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.20)',
    borderDefault: 'rgba(255, 255, 255, 0.30)',
    borderStrong: 'rgba(255, 255, 255, 0.50)',
    borderFocus: 'rgba(255, 255, 0, 0.70)',
    
    // Text
    textPrimary: '#ffffff',
    textSecondary: '#e5e5e5',
    textTertiary: '#cccccc',
    textDisabled: '#888888',
    textInverse: '#000000',
    
    // Primary/Accent (Yellow for high contrast)
    primary: '#FFEB3B',
    primaryHover: '#FFF176',
    primaryPressed: '#FDD835',
    primarySubtle: 'rgba(255, 235, 59, 0.15)',
    
    // Semantic - More saturated
    success: '#00FF00',
    successSubtle: 'rgba(0, 255, 0, 0.15)',
    warning: '#FFAA00',
    warningSubtle: 'rgba(255, 170, 0, 0.15)',
    error: '#FF0000',
    errorSubtle: 'rgba(255, 0, 0, 0.15)',
    info: '#00BFFF',
    infoSubtle: 'rgba(0, 191, 255, 0.15)',
    
    // Expiry status - High visibility
    expired: '#FF0000',
    critical: '#FF6600',
    withdrawal: '#FF9900',
    nextExpiry: '#FFCC00',
    safe: '#00FF00',
  }
};

// ============================================================================
// CONTEXTO
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// ============================================================================
// HOOK PARA ACCESO DIRECTO (sin provider)
// ============================================================================

export const useThemeColors = (): ThemeColors => {
  const mode = useThemeValue('mode');
  return THEME_PALETTES[mode];
};

function useThemeValue(key: keyof ThemeContextValue): any {
  const context = useContext(ThemeContext);
  return context ? context[key] : undefined;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  defaultScheme?: ThemeScheme;
  persistKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'dark',
  defaultScheme = 'appsheet',
  persistKey = 'theme_preferences'
}) => {
  // Cargar preferencias guardadas
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(`${persistKey}_mode`);
      return (saved as ThemeMode) || defaultMode;
    } catch {
      return defaultMode;
    }
  });
  
  const [scheme, setScheme] = useState<ThemeScheme>(() => {
    try {
      const saved = localStorage.getItem(`${persistKey}_scheme`);
      return (saved as ThemeScheme) || defaultScheme;
    } catch {
      return defaultScheme;
    }
  });

  // Persistir cambios
  useEffect(() => {
    try {
      localStorage.setItem(`${persistKey}_mode`, mode);
      localStorage.setItem(`${persistKey}_scheme`, scheme);
    } catch {}
  }, [mode, scheme, persistKey]);

  // Aplicar tema al DOM
  const applyTheme = useCallback(() => {
    const colors = THEME_PALETTES[mode];
    const root = document.documentElement;
    
    // Aplicar variables CSS
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });
    
    // Aplicar clase de tema al body
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
    document.body.classList.add(`theme-${mode}`);
    
    // Scheme class
    document.body.classList.remove('scheme-appsheet', 'scheme-noche-gray', 'scheme-industrial');
    document.body.classList.add(`scheme-${scheme}`);
  }, [mode, scheme]);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Acciones
  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'high-contrast' : 'dark');
  }, []);

  const getColor = useCallback((path: string): string => {
    const colors = THEME_PALETTES[mode];
    const keys = path.split('.');
    let value: any = colors;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || colors.textPrimary;
  }, [mode]);

  const getClass = useCallback((classes: Partial<Record<ThemeMode, string>>): string => {
    return classes[mode] || '';
  }, [mode]);

  const getCSSVariable = useCallback((name: string): string => {
    return `var(--theme-${name.replace(/([A-Z])/g, '-$1').toLowerCase()})`;
  }, []);

  const value: ThemeContextValue = {
    mode,
    scheme,
    isDark: mode === 'dark',
    isHighContrast: mode === 'high-contrast',
    isLight: mode === 'light',
    colors: THEME_PALETTES[mode],
    setMode,
    setScheme,
    toggleMode,
    getColor,
    getClass,
    getCSSVariable,
    applyTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Clases CSS predefinidas basadas en el tema actual
 */
export const getThemeClasses = (mode: ThemeMode) => ({
  // Containers
  container: mode === 'dark' 
    ? 'bg-[#0f0f0f] text-[#f0f0f0]' 
    : mode === 'light'
      ? 'bg-white text-zinc-900'
      : 'bg-black text-white',
  
  surface: mode === 'dark'
    ? 'bg-[#252525] border border-[rgba(255,255,255,0.08)]'
    : mode === 'light'
      ? 'bg-white border border-[rgba(0,0,0,0.06)]'
      : 'bg-[#141414] border border-[rgba(255,255,255,0.20)]',
  
  card: mode === 'dark'
    ? 'bg-[#2d2d2d] border border-[rgba(255,255,255,0.08)] rounded-xl'
    : mode === 'light'
      ? 'bg-white border border-[rgba(0,0,0,0.06)] rounded-xl shadow-sm'
      : 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.30)] rounded-xl',
  
  // Interactive
  hover: mode === 'dark'
    ? 'hover:bg-[rgba(255,255,255,0.06)]'
    : mode === 'light'
      ? 'hover:bg-[rgba(0,0,0,0.04)]'
      : 'hover:bg-[rgba(255,255,255,0.10)]',
  
  active: mode === 'dark'
    ? 'active:bg-[rgba(255,255,255,0.10)]'
    : mode === 'light'
      ? 'active:bg-[rgba(0,0,0,0.08)]'
      : 'active:bg-[rgba(255,255,255,0.15)]',
  
  // Text
  textPrimary: mode === 'dark'
    ? 'text-[#f0f0f0]'
    : mode === 'light'
      ? 'text-zinc-900'
      : 'text-white',
  
  textSecondary: mode === 'dark'
    ? 'text-[#a1a1aa]'
    : mode === 'light'
      ? 'text-zinc-600'
      : 'text-[#e5e5e5]',
  
  textDisabled: mode === 'dark'
    ? 'text-[#52525b]'
    : mode === 'light'
      ? 'text-zinc-400'
      : 'text-[#888888]',
  
  // Buttons
  btnPrimary: mode === 'dark'
    ? 'bg-[#8AB4F8] hover:bg-[#AECBFA] text-black'
    : mode === 'light'
      ? 'bg-blue-600 hover:bg-blue-500 text-white'
      : 'bg-[#FFEB3B] hover:bg-[#FFF176] text-black',
  
  btnSecondary: mode === 'dark'
    ? 'bg-[#2d2d2d] hover:bg-[#353535] text-[#f0f0f0] border border-[rgba(255,255,255,0.12)]'
    : mode === 'light'
      ? 'bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200'
      : 'bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[rgba(255,255,255,0.30)]',
  
  // Inputs
  input: mode === 'dark'
    ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] text-[#f0f0f0] placeholder:text-[#71717a] focus:border-[rgba(138,180,248,0.50)]'
    : mode === 'light'
      ? 'bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500'
      : 'bg-[#0a0a0a] border border-[rgba(255,255,255,0.30)] text-white placeholder:text-[#888888] focus:border-[rgba(255,235,59,0.70)]',
});

/**
 * Helper para generar clases de color dinámico
 */
export const cnTheme = (mode: ThemeMode, base: string, variants?: Record<string, string>) => {
  const classes = [base];
  
  if (variants) {
    const variantClass = variants[mode];
    if (variantClass) {
      classes.push(variantClass);
    }
  }
  
  return classes.join(' ');
};

// ============================================================================
// COMPONENTES BASE
// ============================================================================

interface ThemedComponentProps {
  children: ReactNode;
  className?: string;
}

export const ThemedSurface: React.FC<ThemedComponentProps> = ({ children, className = '' }) => {
  const { mode, isDark, isLight, isHighContrast } = useTheme();
  
  const baseClasses = [
    'rounded-xl transition-colors duration-200',
    isDark && 'bg-[#252525] border border-[rgba(255,255,255,0.08)]',
    isLight && 'bg-white border border-[rgba(0,0,0,0.06)]',
    isHighContrast && 'bg-[#141414] border-2 border-white',
  ].filter(Boolean).join(' ');
  
  return <div className={`${baseClasses} ${className}`}>{children}</div>;
};

export const ThemedCard: React.FC<ThemedComponentProps & { hoverable?: boolean }> = ({ 
  children, 
  className = '', 
  hoverable = false 
}) => {
  const { isDark, isLight, isHighContrast } = useTheme();
  
  const baseClasses = [
    'rounded-xl transition-all duration-200',
    isDark && 'bg-[#2d2d2d] border border-[rgba(255,255,255,0.08)]',
    isLight && 'bg-white border border-[rgba(0,0,0,0.06)] shadow-sm',
    isHighContrast && 'bg-[#1a1a1a] border-2 border-white',
    hoverable && (isDark ? 'hover:bg-[#353535] hover:border-[rgba(255,255,255,0.12)]' : 
                 isLight ? 'hover:shadow-md hover:border-[rgba(0,0,0,0.10)]' : 
                 'hover:bg-[#252525]'),
  ].filter(Boolean).join(' ');
  
  return <div className={`${baseClasses} ${className}`}>{children}</div>;
};

export const ThemedButton: React.FC<ThemedComponentProps & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}) => {
  const { isDark, isLight, isHighContrast } = useTheme();
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const variantClasses = {
    primary: [
      'font-semibold',
      isDark && 'bg-[#8AB4F8] hover:bg-[#AECBFA] text-black',
      isLight && 'bg-blue-600 hover:bg-blue-500 text-white',
      isHighContrast && 'bg-[#FFEB3B] hover:bg-[#FFF176] text-black font-bold',
    ].filter(Boolean).join(' '),
    
    secondary: [
      'font-medium',
      isDark && 'bg-[#2d2d2d] hover:bg-[#353535] text-[#f0f0f0] border border-[rgba(255,255,255,0.12)]',
      isLight && 'bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200',
      isHighContrast && 'bg-transparent hover:bg-white/10 text-white border-2 border-white',
    ].filter(Boolean).join(' '),
    
    ghost: [
      'font-medium',
      isDark && 'bg-transparent hover:bg-[rgba(255,255,255,0.06)] text-[#a1a1aa]',
      isLight && 'bg-transparent hover:bg-zinc-100 text-zinc-600',
      isHighContrast && 'bg-transparent hover:bg-white/10 text-white',
    ].filter(Boolean).join(' '),
    
    danger: [
      'font-semibold',
      isDark && 'bg-[#F87171] hover:bg-red-400 text-white',
      isLight && 'bg-red-600 hover:bg-red-500 text-white',
      isHighContrast && 'bg-red-500 hover:bg-red-400 text-white font-bold',
    ].filter(Boolean).join(' '),
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} rounded-lg transition-colors duration-150 ${className}`}
    >
      {children}
    </button>
  );
};

export const ThemedInput: React.FC<ThemedComponentProps & {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
}> = ({ 
  children, 
  className = '', 
  type = 'text',
  placeholder,
  value,
  onChange,
  error = false
}) => {
  const { isDark, isLight, isHighContrast } = useTheme();
  
  const baseClasses = [
    'w-full px-4 py-2 rounded-lg border transition-colors duration-150 outline-none',
    isDark && !error && 'bg-[#1a1a1a] border-[rgba(255,255,255,0.12)] text-[#f0f0f0] placeholder:text-[#71717a] focus:border-[rgba(138,180,248,0.50)]',
    isLight && !error && 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500',
    isHighContrast && !error && 'bg-black border-2 border-white text-white placeholder:text-[#888888] focus:border-yellow-400',
    error && 'border-red-500 focus:border-red-500',
    children && 'pl-10',
  ].filter(Boolean).join(' ');
  
  return (
    <div className="relative">
      {children && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]">
          {children}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`${baseClasses} ${className}`}
      />
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ThemeProvider;
