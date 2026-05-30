/**
 * Search input clear-button invariants for ActiveClaimsTable.
 *
 * Audit finding: "Input clear button missing → Fix: Add 'X' to search."
 *
 * Invariants enforced here:
 *   1. The clear button is hidden when the search input is empty.
 *      (Showing an X for an empty field is a usability anti-pattern.)
 *   2. Once the user types a value, an X button with an accessible
 *      name "Clear search" appears next to the input.
 *   3. Clicking the X clears the input value.
 *   4. After clearing, focus returns to the search input so keyboard
 *      users do not lose their place.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ActiveClaimsTable from '@/components/features/ActiveClaimsTable';

describe('ActiveClaimsTable — search clear button', () => {
  it('does not render the clear button when the search input is empty', () => {
    render(<ActiveClaimsTable />);

    expect(
      screen.queryByRole('button', { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it('renders the clear button after the user types into the search input', () => {
    render(<ActiveClaimsTable />);

    const searchInput = screen.getByLabelText(/search claims/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'climate' } });

    expect(searchInput.value).toBe('climate');
    expect(
      screen.getByRole('button', { name: /clear search/i })
    ).toBeInTheDocument();
  });

  it('clicking the clear button empties the input and re-focuses it', () => {
    render(<ActiveClaimsTable />);

    const searchInput = screen.getByLabelText(/search claims/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'climate' } });

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);

    expect(searchInput.value).toBe('');
    // After clearing, the X disappears (invariant #1) and focus is returned
    // to the input (invariant #4).
    expect(
      screen.queryByRole('button', { name: /clear search/i })
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(searchInput);
  });

  it('clear button has type="button" so it never submits an enclosing form', () => {
    render(<ActiveClaimsTable />);

    const searchInput = screen.getByLabelText(/search claims/i);
    fireEvent.change(searchInput, { target: { value: 'x' } });

    const clearBtn = screen.getByRole('button', {
      name: /clear search/i,
    }) as HTMLButtonElement;
    expect(clearBtn.type).toBe('button');
  });
});
