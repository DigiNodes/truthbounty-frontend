// src/lib/theme-init.tsx
/**
 * Inline script to prevent theme flicker on page load
 * This should be executed as early as possible in the document head
 */

export const themeInitScript = `
(function() {
  try {
    const THEME_STORAGE_KEY = 'tb-theme';
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = storedTheme || 'system';
    
    let resolvedTheme;
    if (theme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = theme;
    }
    
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch (e) {
    // Fallback to dark theme if there's an error
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

interface ThemeInitScriptProps {
  nonce?: string;
}

export function ThemeInitScript({ nonce }: ThemeInitScriptProps) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
      nonce={nonce}
    />
  );
}
