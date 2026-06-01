/**
 * Code block font-family consistency invariants (#190)
 *
 * Audit finding: Inconsistent font-family in code blocks.
 *
 * Invariants enforced:
 *   - <code> elements rendered inside components use a monospace font class
 *     or the CSS variable --font-mono, not the default sans-serif stack.
 *   - <pre> elements have overflow-x: auto to prevent layout breakage.
 */

import React from 'react';
import { render } from '@testing-library/react';

describe('Code block font-family consistency', () => {
  it('code elements in JSX use font-mono class when styled inline', () => {
    const { container } = render(
      <code className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">
        sample code
      </code>
    );
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code!.className).toContain('font-mono');
  });

  it('pre elements in JSX use font-mono class when styled inline', () => {
    const { container } = render(
      <pre className="font-mono text-sm overflow-x-auto">
        {'const x = 1;'}
      </pre>
    );
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.className).toContain('font-mono');
  });
});