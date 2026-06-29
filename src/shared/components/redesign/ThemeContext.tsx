import React, { useEffect, createContext, useContext } from 'react';
import { useSettingsStore } from '@/stores';

type Theme = 'dark' | 'light' | 'gray';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

export const useRedesignTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useRedesignTheme must be used within a RedesignThemeProvider');
  }
  return context;
};

// Alias para compatibilidad con componentes del rediseño original
export const useTheme = useRedesignTheme;