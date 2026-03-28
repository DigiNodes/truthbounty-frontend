// src/components/ui/ThemeToggle.tsx

'use client';

import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { Theme } from '@/lib/theme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleToggle = () => {
    // Cycle through: system -> light -> dark -> system
    const nextTheme: Record<Theme, Theme> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    
    setTheme(nextTheme[theme]);
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4" />;
    }
    if (theme === 'light') {
      return <Sun className="w-4 h-4" />;
    }
    return <Moon className="w-4 h-4" />;
  };

  const getLabel = () => {
    if (showLabel) {
      const labels: Record<Theme, string> = {
        system: 'System',
        light: 'Light',
        dark: 'Dark',
      };
      return labels[theme];
    }
    return null;
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#232329] hover:bg-[#2a2a32] text-white transition-colors ${className}`}
      title={`Theme: ${theme} (click to change)`}
      aria-label={`Toggle theme (current: ${theme})`}
    >
      {getIcon()}
      {getLabel()}
    </button>
  );
}
