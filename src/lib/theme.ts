// src/lib/theme.ts

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'tb-theme';

/**
 * Get theme from localStorage
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored as Theme | null;
}

/**
 * Save theme to localStorage
 */
export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Get system color scheme preference
 */
export function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

/**
 * Get the actual theme to apply (resolves 'system' to actual value)
 */
export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemPreference();
  }
  return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  
  const resolvedTheme = getResolvedTheme(theme);
  
  // Remove both themes first
  document.documentElement.classList.remove('light', 'dark');
  
  // Apply the resolved theme
  document.documentElement.classList.add(resolvedTheme);
  
  // Update color-scheme meta tag for browser UI
  document.documentElement.style.colorScheme = resolvedTheme;
}

/**
 * Initialize theme on app load (prevents flicker)
 * This should be called as early as possible
 */
export function initializeTheme(): Theme {
  const storedTheme = getStoredTheme();
  const theme = storedTheme || 'system';
  
  applyTheme(theme);
  return theme;
}

/**
 * Listen for system theme changes
 */
export function onSystemThemeChange(callback: (isDark: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}
