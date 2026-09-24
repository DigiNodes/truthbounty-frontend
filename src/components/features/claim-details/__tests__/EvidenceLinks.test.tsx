import React from 'react';
import { render, screen } from '@testing-library/react';

import { EvidenceLinks } from '../EvidenceLinks';

describe('EvidenceLinks', () => {
  it('renders safe evidence urls as links', () => {
    render(
      <EvidenceLinks
        evidences={[
          {
            id: 'ev-1',
            title: 'Report',
            description: 'Official report',
            url: 'https://docs.example.com/report',
          },
        ]}
      />
    );

    const link = screen.getByRole('link', { name: /view/i });
    expect(link).toHaveAttribute(
      'href',
      'https://docs.example.com/report'
    );
  });

  it('blocks unsafe evidence urls instead of rendering a clickable link', () => {
    render(
      <EvidenceLinks
        evidences={[
          {
            id: 'ev-2',
            title: 'Phish',
            description: 'Contains a script payload',
            url: 'javascript:alert(document.cookie)',
          },
        ]}
      />
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
  });

  it('blocks protocol-relative urls', () => {
    render(
      <EvidenceLinks
        evidences={[
          {
            id: 'ev-3',
            title: 'Evil',
            description: 'Scheme-inheriting url',
            url: '//evil.example/path',
          },
        ]}
      />
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
  });
});