import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvidenceViewer } from '../EvidenceViewer';

describe('EvidenceViewer - accordion aria-expanded', () => {
  it('renders toggle button with aria-expanded=true by default', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const button = screen.getByRole('button', { name: /evidence/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles aria-expanded when button is clicked', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const button = screen.getByRole('button', { name: /evidence/i });

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides evidence content when collapsed', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const button = screen.getByRole('button', { name: /evidence/i });

    fireEvent.click(button);
    expect(screen.queryByText('Witness testimony text')).not.toBeInTheDocument();
  });

  it('shows evidence content when expanded', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    expect(screen.getByText('Witness testimony text')).toBeInTheDocument();
  });

  it('button has aria-controls pointing to content id', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const button = screen.getByRole('button', { name: /evidence/i });
    expect(button).toHaveAttribute('aria-controls', 'evidence-content');
  });
});

describe('EvidenceViewer - scroll lock', () => {
  it('renders a scroll container when expanded', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    expect(screen.getByTestId('evidence-scroll-container')).toBeInTheDocument();
  });

  it('does not render the scroll container when collapsed', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    fireEvent.click(screen.getByRole('button', { name: /evidence/i }));
    expect(screen.queryByTestId('evidence-scroll-container')).not.toBeInTheDocument();
  });

  it('applies overscroll-behavior: contain to prevent scroll chaining (lock)', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const container = screen.getByTestId('evidence-scroll-container');
    // Inline style invariant: scroll must be contained within the viewer
    expect(container.style.overscrollBehavior).toBe('contain');
  });

  it('bounds the panel height so only one scroll surface exists', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const container = screen.getByTestId('evidence-scroll-container');
    // Invariant: max-height is bounded (prevents the page from being the scroller too)
    expect(container.style.maxHeight).toBe('60vh');
  });

  it('uses overflow-y auto + overscroll-contain utility classes', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const container = screen.getByTestId('evidence-scroll-container');
    expect(container).toHaveClass('overflow-y-auto');
    expect(container).toHaveClass('overscroll-contain');
  });

  it('protocol invariant: scroll lock is active iff the panel is expanded', () => {
    render(<EvidenceViewer claimId="claim-1" />);
    const button = screen.getByRole('button', { name: /evidence/i });

    // expanded -> scroll container present (lock active)
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('evidence-scroll-container')).toBeInTheDocument();

    // collapsed -> scroll container absent (no scrollable surface, no lock needed)
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('evidence-scroll-container')).not.toBeInTheDocument();

    // re-expanded -> lock re-engaged with same invariants
    fireEvent.click(button);
    const container = screen.getByTestId('evidence-scroll-container');
    expect(container.style.overscrollBehavior).toBe('contain');
    expect(container.style.maxHeight).toBe('60vh');
  });
});
