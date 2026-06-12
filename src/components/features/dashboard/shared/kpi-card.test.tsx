import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    render(<KpiCard title="Total Assets" value="1,234" subText1="Active" subText2="vs last month" />);
    
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders currency symbol', () => {
    render(<KpiCard title="Value" value="50,000" currencySymbol="$" subText1="Total" subText2="Estimated" />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('renders positive trend badge', () => {
    render(<KpiCard title="Growth" value="10%" trendValue={5.2} subText1="Up" subText2="" />);
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
  });

  it('renders negative trend badge', () => {
    render(<KpiCard title="Issues" value="15" trendValue={-2.5} subText1="Down" subText2="" />);
    expect(screen.getByText('-2.5%')).toBeInTheDocument();
  });

  it('renders custom badge text', () => {
    render(<KpiCard title="Status" value="OK" badgeText="Stable" subText1="Sys" subText2="" />);
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('renders as a link if href is provided', () => {
    render(<KpiCard title="Link" value="Click" href="/details" subText1="Go" subText2="" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/details');
  });
});
