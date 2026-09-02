/**
 * Ambient declarations for jest-axe (v11 ships no bundled types) and its
 * `toHaveNoViolations` matcher used across accessibility tests.
 */
declare module 'jest-axe';

declare namespace jest {
  interface Matchers<R> {
    toHaveNoViolations(): R;
  }
}

declare module 'jest-axe' {
  import type { AxeResults } from 'axe-core';

  export interface AxeOptions {
    rules?: Record<string, { enabled?: boolean }>;
  }

  export function configureAxe(options?: AxeOptions): (container: HTMLElement) => Promise<AxeResults>;
  export const axe: (container: HTMLElement) => Promise<AxeResults>;
  export function toHaveNoViolations(): jest.CustomMatcherResult;
}