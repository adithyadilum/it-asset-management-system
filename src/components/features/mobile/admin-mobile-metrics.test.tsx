import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminMobileMetrics } from './admin-mobile-metrics';

describe.skip('AdminMobileMetrics', () => {
  const mockMetrics = {
    totalDevices: 100,
    activeScansToday: 10,
    pendingSyncs: 5,
    offlineDevices: 2,
    trend: {
      total: 5,
      scans: 2
    }
  };

  it('renders correctly', () => {
    render(<AdminMobileMetrics />);
    expect(screen.getByText('Quick Metrics')).toBeInTheDocument();
  });
});
