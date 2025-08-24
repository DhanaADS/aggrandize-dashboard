'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeColor, getStoredTheme, setStoredTheme, DEFAULT_THEME } from '@/lib/theme-colors';

interface ThemeContextType {
  currentTheme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: DEFAULT_THEME,
  setTheme: () => {}
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(DEFAULT_THEME);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load theme from localStorage on mount
    const storedTheme = getStoredTheme();
    setCurrentTheme(storedTheme);
    setIsInitialized(true);
  }, []);

  const setTheme = (theme: ThemeColor) => {
    setCurrentTheme(theme);
    setStoredTheme(theme.id);
  };

  // Don't render until theme is loaded to prevent flash
  if (!isInitialized) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid #ffffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};