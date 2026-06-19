import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DisposalReviewPanel } from './disposal-review-panel';
import { formatMoneyByCurrency } from '@/lib/currency';

vi.mock('@/components/shared/slide-panel', () => ({
  SlidePanel: ({ isOpen, title, content, actions }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="slide-panel">
        <div>{title}</div>
        <div>{content}</div>
        <div>
          {actions.map((action: any) => (
            <button key={action.id} onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
}));

describe('DisposalReviewPanel', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    assetTag: 'TAG-123',
    model: 'Laptop Pro',
    serialNumber: 'SN-123',
    category: 'Laptop',
    brand: 'BrandX',
    dateCreated: '2023-01-01',
    requestedBy: 'User A',
    dateRequested: '2023-11-01',
    reason: 'End of Life',
    justification: 'Device is 5 years old',
    purchaseDate: '2018-01-01',
    originalCost: 1000,
    currentBookValue: 0,
    currencyCode: 'USD',
    warrantyStatus: 'Expired',
    onReject: vi.fn(),
    onApprove: vi.fn(),
  };

  it('renders content correctly', () => {
    render(<DisposalReviewPanel {...mockProps} />);

    expect(screen.getByTestId('slide-panel')).toBeInTheDocument();
    
    // Details
    expect(screen.getByText('TAG-123')).toBeInTheDocument();
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    expect(screen.getByText('BrandX')).toBeInTheDocument();
    
    // Disposal request details
    expect(screen.getByText('User A')).toBeInTheDocument();
    expect(screen.getByText('End of Life')).toBeInTheDocument();
    expect(screen.getByText('Device is 5 years old')).toBeInTheDocument();
    
    // Financials
    expect(screen.getByText(formatMoneyByCurrency(1000, 'USD'))).toBeInTheDocument();
    expect(screen.getByText(formatMoneyByCurrency(0, 'USD'))).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    render(<DisposalReviewPanel {...mockProps} isLoading={true} />);
    
    expect(screen.getByTestId('slide-panel')).toBeInTheDocument();
    expect(screen.queryByText('TAG-123')).not.toBeInTheDocument();
  });

  it('calls action handlers', () => {
    render(<DisposalReviewPanel {...mockProps} />);

    const rejectBtn = screen.getByRole('button', { name: 'Reject' });
    const approveBtn = screen.getByRole('button', { name: 'Initiate Disposal' });

    fireEvent.click(rejectBtn);
    expect(mockProps.onReject).toHaveBeenCalled();

    fireEvent.click(approveBtn);
    expect(mockProps.onApprove).toHaveBeenCalled();
  });
});
