/**
 * useTheme - Hook para manejar temas de la aplicación
 * 
 * Proporciona clases de CSS según el tema activo (dark, light, high-contrast)
 * para aplicar estilos consistentes en toda la aplicación.
 */

import { useMemo } from 'react';
import { useAppStore } from '@/store/mainAppStore';

export type Theme = 'dark' | 'light' | 'high-contrast';

export interface ThemeClasses {
  // Fondos
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  
  // Textos
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Bordes
  border: string;
  borderHover: string;
  
  // Estados
  hover: string;
  active: string;
  disabled: string;
  
  // Cards
  card: string;
  cardHover: string;
  
  // Inputs
  input: string;
  inputFocus: string;
  
  // Botones primarios
  primary: string;
  primaryHover: string;
  
  // Sombras
  shadow: string;
  
  // Overlay
  overlay: string;
}

const darkTheme: ThemeClasses = {
  bg: 'bg-slate-950',
  bgSecondary: 'bg-black/40',
  bgTertiary: 'bg-white/5',
  text: 'text-white',
  textSecondary: 'text-slate-300',
  textMuted: 'text-slate-500',
  border: 'border-white/10',
  borderHover: 'hover:border-white/20',
  hover: 'hover:bg-white/5',
  active: 'active:bg-white/10',
  disabled: 'opacity-50 cursor-not-allowed',
  card: 'bg-slate-900 border-white/10',
  cardHover: 'hover:border-white/20',
  input: 'bg-black/40 border-white/10 text-white placeholder:text-slate-500',
  inputFocus: 'focus:border-blue-500',
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
  primaryHover: 'hover:bg-blue-500',
  shadow: 'shadow-black/40',
  overlay: 'bg-black/60',
};

const lightTheme: ThemeClasses = {
  bg: 'bg-slate-50',
  bgSecondary: 'bg-slate-100',
  bgTertiary: 'bg-slate-200/50',
  text: 'text-slate-900',
  textSecondary: 'text-slate-700',
  textMuted: 'text-slate-500',
  border: 'border-slate-200',
  borderHover: 'hover:border-slate-300',
  hover: 'hover:bg-slate-100',
  active: 'active:bg-slate-200',
  disabled: 'opacity-50 cursor-not-allowed',
  card: 'bg-white border-slate-200',
  cardHover: 'hover:border-slate-300 hover:shadow-md',
  input: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
  inputFocus: 'focus:border-blue-500',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
  primaryHover: 'hover:bg-blue-700',
  shadow: 'shadow-slate-200/50',
  overlay: 'bg-black/40',
};

const highContrastTheme: ThemeClasses = {
  bg: 'bg-black',
  bgSecondary: 'bg-yellow-950/30',
  bgTertiary: 'bg-yellow-900/20',
  text: 'text-yellow-400',
  textSecondary: 'text-yellow-300',
  textMuted: 'text-yellow-500',
  border: 'border-yellow-400',
  borderHover: 'hover:border-yellow-300',
  hover: 'hover:bg-yellow-900/20',
  active: 'active:bg-yellow-900/30',
  disabled: 'opacity-50 cursor-not-allowed',
  card: 'bg-black border-yellow-400',
  cardHover: 'hover:border-yellow-300',
  input: 'bg-black border-yellow-400 text-yellow-400 placeholder:text-yellow-600',
  inputFocus: 'focus:border-yellow-300',
  primary: 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20',
  primaryHover: 'hover:bg-yellow-300',
  shadow: 'shadow-yellow-400/10',
  overlay: 'bg-black/80',
};

/**
 * Hook principal para obtener las clases de tema
 */
export function useTheme() {
  const { settings } = useAppStore();
  const theme = (settings?.theme || 'dark') as Theme;

  const classes = useMemo(() => {
    switch (theme) {
      case 'light':
        return lightTheme;
      case 'high-contrast':
        return highContrastTheme;
      default:
        return darkTheme;
    }
  }, [theme]);

  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  /**
   * Obtiene una clase condicional basada en el tema
   */
  const conditional = (darkClass: string, lightClass: string) => {
    return theme === 'light' ? lightClass : darkClass;
  };

  /**
   * Combina las clases de tema con clases personalizadas
   */
  const merge = (...customClasses: (string | undefined)[]) => {
    return customClasses.filter(Boolean).join(' ');
  };

  return {
    theme,
    classes,
    isDark,
    isLight,
    isHighContrast,
    conditional,
    merge,
  };
}

/**
 * Versión hook para usar directamente con props de componentes
 */
export function useThemeClasses() {
  const { classes, isDark, isLight, isHighContrast } = useTheme();

  return {
    // Clases base
    container: `${classes.bg} ${classes.text}`,
    
    // Fondos
    background: classes.bg,
    backgroundSecondary: classes.bgSecondary,
    backgroundTertiary: classes.bgTertiary,
    
    // Textos  
    text: classes.text,
    textSecondary: classes.textSecondary,
    textMuted: classes.textMuted,
    
    // Bordes
    border: classes.border,
    borderHover: classes.borderHover,
    
    // Estados
    hover: classes.hover,
    active: classes.active,
    disabled: classes.disabled,
    
    // Cards
    card: classes.card,
    cardHover: classes.cardHover,
    
    // Inputs
    input: classes.input,
    inputFocus: classes.inputFocus,
    
    // Botones
    primary: classes.primary,
    primaryHover: classes.primaryHover,
    
    // Sombras
    shadow: classes.shadow,
    
    // Overlay
    overlay: classes.overlay,
    
    // Utilidades
    isDark,
    isLight,
    isHighContrast,
  };
}
