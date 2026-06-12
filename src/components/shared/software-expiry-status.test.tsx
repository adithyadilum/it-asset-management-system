import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoftwareExpiryStatus } from './software-expiry-status';

describe('SoftwareExpiryStatus', () => {
  beforeEach(() => {
    // Mock system time to a fixed date: 2024-01-01
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders "Perpetual" when expiryDate is null', () => {
    render(<SoftwareExpiryStatus status="Active" expiryDate={null} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Perpetual')).toBeInTheDocument();
  });

  it('renders "Expired" and red styling if date is in the past', () => {
    render(<SoftwareExpiryStatus status="Active" expiryDate="2023-12-31" />);
    const text = screen.getByText('Expired');
    // Using positive lookahead or simply checking class name if text gets exact match
    expect(text).toHaveClass('text-red-600');
  });

  it('renders warning threshold (<= 30 days) with amber styling', () => {
    // 15 days in the future
    render(<SoftwareExpiryStatus status="Expiring Soon" expiryDate="2024-01-16T00:00:00Z" />);
    const text = screen.getByText('15 days left');
    expect(text).toHaveClass('text-amber-600');
  });

  it('renders safe threshold (> 30 days) with green styling', () => {
    // 60 days in the future
    render(<SoftwareExpiryStatus status="Active" expiryDate="2024-03-01T00:00:00Z" />);
    const text = screen.getByText('60 days left');
    expect(text).toHaveClass('text-green-600');
  });

  it('applies custom className to the container', () => {
    const { container } = render(
      <SoftwareExpiryStatus status="Active" expiryDate={null} className="custom-wrapper" />
    );
    expect(container.firstChild).toHaveClass('custom-wrapper');
  });
});
