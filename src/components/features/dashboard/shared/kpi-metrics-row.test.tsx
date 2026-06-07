import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KpiMetricsRow } from './kpi-metrics-row';

describe('KpiMetricsRow', () => {
  it('renders metrics row', () => {
    const mockMetrics = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'totalActiveAssetsChange' || prop === 'totalAssetValueTrend') return 5;
        if (prop === 'totalAssetValue') return 50000;
        return 1200;
      }
    });
    
    render(<KpiMetricsRow metrics={mockMetrics as any} />);
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
  });
});
