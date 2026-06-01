/**
 * ThemeToggle icon contrast invariants
 *
 * Audit finding: #197 - ThemeToggle icon contrast
 *
 * Invariants enforced:
 *   - Button uses theme-aware background classes (not hardcoded dark bg).
 *   - Button has accessible aria-label.
 *   - Icons have aria-hidden to avoid duplicate announcements.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

jest.mock('@/components/providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  }),
}));

describe('ThemeToggle — icon contrast', () => {
  it('renders a button with an accessible aria-label', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn.getAttribute('aria-label')).toMatch(/toggle theme/i);
  });

  it('does not use hardcoded dark background class', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('bg-[#232329]');
  });

  it('uses theme-aware background classes for light mode', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-gray-100/);
    expect(btn.className).toMatch(/dark:bg-gray-800/);
  });

  it('icons are hidden from assistive technology', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    const svgs = btn.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});