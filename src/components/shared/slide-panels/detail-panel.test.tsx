import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DetailPanel } from './detail-panel';

describe('DetailPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Asset Details',
    fields: [
      { label: 'Name', value: 'MacBook' },
      { label: 'Status', value: 'Active' },
    ],
  };

  it('renders title and fields when open', () => {
    render(<DetailPanel {...defaultProps} />);
    expect(screen.getByText('Asset Details')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('MacBook')).toBeInTheDocument();
  });

  it('renders badges if provided', () => {
    render(<DetailPanel {...defaultProps} badges={['New', <span key="custom">CustomBadge</span>]} />);
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('CustomBadge')).toBeInTheDocument();
  });

  it('renders empty state when no fields are provided', () => {
    render(<DetailPanel {...defaultProps} fields={[]} />);
    expect(screen.getByText('No detail fields were provided.')).toBeInTheDocument();
  });

  it('renders custom actions and overrides default actions', () => {
    render(
      <DetailPanel 
        {...defaultProps} 
        actions={[{ label: 'Custom Action', onClick: vi.fn() }]} 
      />
    );
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument(); // default action shouldn't be there
  });
});
