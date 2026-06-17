
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisposeAssetsRequestDialog } from './dispose-assets-request-dialog';
import { createBulkDisposalRequests } from '@/actions/disposals/create-bulk';
import { tiqriToast } from '@/components/shared/sonner';

vi.mock('@/actions/disposals/create-bulk', () => ({
  createBulkDisposalRequests: vi.fn(),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select-mock" data-value={value}>
      {children}
      <button onClick={() => onValueChange('Damaged beyond repair')}>Select Damaged</button>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock PointerEvent for Radix UI Dialog
if (typeof global.PointerEvent == 'undefined') {
  class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    constructor(type: string, props: any) {
      super(type, props);
      this.button = props?.button || 0;
      this.ctrlKey = props?.ctrlKey || false;
    }
  }
  vi.stubGlobal('PointerEvent', MockPointerEvent as any);
}
HTMLElement.prototype.hasPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

describe('DisposeAssetsRequestDialog', () => {
  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
    HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockOnOpenChange = vi.fn();
  const mockOnSubmitted = vi.fn();
  const mockAssets = [
    { id: '1', assetTag: 'TAG-1', assetName: 'Laptop' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <DisposeAssetsRequestDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSubmitted={mockOnSubmitted}
      />
    );

    expect(screen.getByText('Request Asset Disposal')).toBeInTheDocument();
    expect(screen.getByText('TAG-1')).toBeInTheDocument();
  });

  it('validates and submits successfully', async () => {
    (createBulkDisposalRequests as any).mockResolvedValue({ inserted: 1, skipped: 0 });

    render(
      <DisposeAssetsRequestDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSubmitted={mockOnSubmitted}
      />
    );

    // Initial submit button should be disabled (reason required)
    const submitBtn = screen.getByRole('button', { name: 'Submit Request' });
    expect(submitBtn).toBeDisabled();

    // Select reason
    fireEvent.click(screen.getByText('Select Damaged'));

    // Now submit should be enabled
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createBulkDisposalRequests).toHaveBeenCalledWith({
        assetIds: ['1'],
        reason: 'Damaged beyond repair', // Assuming it's the first option
        justification: '',
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSubmitted).toHaveBeenCalledWith({ inserted: 1, skipped: 0 });
    });
  });

  it('handles error on submit', async () => {
    (createBulkDisposalRequests as any).mockRejectedValue(new Error('Submit failed'));

    render(
      <DisposeAssetsRequestDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSubmitted={mockOnSubmitted}
      />
    );

    // Need to select reason first
    fireEvent.click(screen.getByText('Select Damaged'));

    const submitBtn = screen.getByRole('button', { name: 'Submit Request' });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tiqriToast.error).toHaveBeenCalledWith('Submit failed');
    });
  });
});
