import React from 'react';
import { render, screen } from '@testing-library/react';
import { RealtimeActivityFeed } from '../RealtimeActivityFeed';

jest.mock('../../../components/providers/WebSocketProvider', () => ({
  useWebSocketContext: () => ({
    subscribe: jest.fn(() => jest.fn()),
    isConnected: false,
  }),
}));

describe('RealtimeActivityFeed', () => {
  it('renders the feed container with aria-live="polite"', () => {
    render(<RealtimeActivityFeed />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('feed container has aria-label', () => {
    render(<RealtimeActivityFeed />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveAttribute('aria-label', 'Live activity feed');
  });
});
