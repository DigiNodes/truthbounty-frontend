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

import ActiveClaimsTable, { ActiveClaimRow } from '@/components/features/ActiveClaimsTable';
import { activeClaims } from '@/__tests__/fixtures/mock-data';

// Fixture rows (development fixtures live under the test boundary, V2-FE-016).
const fixtureRows: ActiveClaimRow[] = activeClaims.map((claim) => ({
  category: claim.category,
  impact: claim.impact,
  title: claim.title,
  source: claim.source,
  status: claim.status,
  confidence: claim.confidence,
  votes: claim.votes,
  stake: claim.stake,
  time: claim.time,
  actions: claim.actions,
}));

function renderTable() {
  return render(<ActiveClaimsTable claims={fixtureRows} />);
}

describe('ActiveClaimsTable — search clear button', () => {
  it('does not render the clear button when the search input is empty', () => {
    renderTable();

    expect(
      screen.queryByRole('button', { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it('renders the clear button after the user types into the search input', () => {
    renderTable();

    const searchInput = screen.getByLabelText(/search claims/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'climate' } });

    expect(searchInput.value).toBe('climate');
    expect(
      screen.getByRole('button', { name: /clear search/i })
    ).toBeInTheDocument();
  });

  it('clicking the clear button empties the input and re-focuses it', () => {
    renderTable();

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

  it('renders a friendly empty state when the selected filter matches no claims', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /disputed/i }));

    expect(
      screen.getByText(/no claims match the current search or filter/i)
    ).toBeInTheDocument();
  });

  it('renders a friendly empty state when the search yields no results', () => {
    renderTable();

    const searchInput = screen.getByLabelText(/search claims/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'impossible-text' } });

    expect(
      screen.getByText(/no claims match the current search or filter/i)
    ).toBeInTheDocument();
  });

  it('clear button has type="button" so it never submits an enclosing form', () => {
    renderTable();

    const searchInput = screen.getByLabelText(/search claims/i);
    fireEvent.change(searchInput, { target: { value: 'x' } });

    const clearBtn = screen.getByRole('button', {
      name: /clear search/i,
    }) as HTMLButtonElement;
    expect(clearBtn.type).toBe('button');
  });

  it('shows an honest empty state when no claims are available', () => {
    render(<ActiveClaimsTable claims={[]} />);

    expect(
      screen.getByText(/no claims available yet/i)
    ).toBeInTheDocument();
  });
});