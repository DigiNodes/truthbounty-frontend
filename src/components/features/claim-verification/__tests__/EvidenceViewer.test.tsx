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
