// src/components/providers/ThemeProvider.tsx

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Theme } from '@/lib/theme';
import { 
  getStoredTheme, 
  saveTheme, 
  getSystemPreference, 
  applyTheme, 
  onSystemThemeChange 
} from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize theme on mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme || defaultTheme;
    
    setThemeState(initialTheme);
    setResolvedTheme(
      initialTheme === 'system' ? getSystemPreference() : initialTheme
    );
    
    applyTheme(initialTheme);
  }, [defaultTheme]);

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (theme !== 'system') return;

    const unsubscribe = onSystemThemeChange((isDark) => {
      const newResolvedTheme = isDark ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      applyTheme('system');
    });

    return unsubscribe;
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    
    const newResolvedTheme = newTheme === 'system' ? getSystemPreference() : newTheme;
    setResolvedTheme(newResolvedTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentResolved = resolvedTheme;
    const newTheme: Theme = currentResolved === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
