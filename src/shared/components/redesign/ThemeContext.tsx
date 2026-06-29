import React, { useEffect, createContext, useContext, useState } from 'react';
import { useSettingsStore } from '@/stores';

type Theme = 'dark' | 'light' | 'gray';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Valor por defecto cuando no hay provider (para evitar crashes)
const defaultContext: ThemeContextType = {
  theme: 'dark',
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export const RedesignThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSetting } = useSettingsStore();
  
  // Usar el tema del store, con fallback a 'dark'
  const theme = (settings.theme as Theme) || 'dark';

  useEffect(() => {
    // Aplicar el tema al documento
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    updateSetting('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useRedesignTheme = (): ThemeContextType => {
  // Siempre retorna el contexto, usando el default si no hay provider
  return useContext(ThemeContext);
};

// Alias para compatibilidad con componentes del rediseño original
export const useTheme = useRedesignTheme;