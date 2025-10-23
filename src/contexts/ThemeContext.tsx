'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, ThemeOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from '@/theme/professional-theme';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('aggrandize-theme') as 'light' | 'dark' | null;
    let initialTheme: 'light' | 'dark' = 'light';

    if (storedTheme) {
      initialTheme = storedTheme;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      initialTheme = prefersDark ? 'dark' : 'light';
    }

    setTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('aggrandize-theme', newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme, mounted]);

  const muiTheme = useMemo(() => {
    const professionalTheme = theme === 'light' ? lightTheme : darkTheme;

    const themeOptions: ThemeOptions = {
      palette: {
        mode: theme,
        primary: {
          main: professionalTheme.colors.primary.main,
        },
        background: {
          default: professionalTheme.colors.background.default,
          paper: professionalTheme.colors.background.paper,
        },
        text: {
          primary: professionalTheme.colors.text.primary,
          secondary: professionalTheme.colors.text.secondary,
        },
        divider: professionalTheme.colors.border.default,
        action: {
          hover: professionalTheme.colors.hover.main,
          selected: professionalTheme.colors.active.main,
        },
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: professionalTheme.colors.background.default,
              color: professionalTheme.colors.text.primary,
            },
          },
        },
      },
    };

    return createTheme(themeOptions);
  }, [theme]);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}