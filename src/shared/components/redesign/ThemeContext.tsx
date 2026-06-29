import React, { useEffect, useState, createContext, useContext } from 'react';

type Theme = 'dark' | 'light' | 'gray';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const RedesignThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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