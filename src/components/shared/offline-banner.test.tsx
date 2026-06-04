import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  const originalOnLine = navigator.onLine;

  const setOnlineStatus = (status: boolean) => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(status);
    window.dispatchEvent(new Event(status ? 'online' : 'offline'));
  };

  afterEach(() => {
    vi.restoreAllMocks();
    setOnlineStatus(originalOnLine);
  });

  it('does not render when online', () => {
    setOnlineStatus(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner when offline', () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);
    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.getByText(/Some features may be unavailable/i)).toBeInTheDocument();
  });
});
