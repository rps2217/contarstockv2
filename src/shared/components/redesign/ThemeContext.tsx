import React from 'react';
import { useTheme as useMainTheme, ThemeName } from '@/hooks/useTheme/useTheme';

// Re-exportar tipos del tema
export type { ThemeName };

// Crear contexto que delega al useTheme principal
// Esto asegura que RedesignThemeProvider sea un wrapper alrededor del ThemeProvider principal

interface RedesignThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

// Este provider no hace nada - el ThemeProvider principal ya está en App.tsx
// Solo proporciona el hook que delega al useTheme principal
export const RedesignThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useRedesignTheme = (): RedesignThemeContextType => {
  const { theme, setTheme } = useMainTheme();
  return { theme, setTheme };
};

// Alias para compatibilidad con componentes del rediseño original
export const useTheme = useRedesignTheme;