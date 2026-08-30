const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture =
  HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RejectDisposalDialog } from './reject-disposal-dialog';
import { rejectDisposalRequest } from '@/actions/disposals/reject';
import { tiqriToast } from '@/components/shared/sonner';

vi.mock('@/actions/disposals/reject', () => ({
  rejectDisposalRequest: vi.fn(),
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
      <button onClick={() => onValueChange('In Repair')}>
        Select In Repair
      </button>
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock PointerEvent for Radix UI Dialog and Select
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

describe('RejectDisposalDialog', () => {
  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
    HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockAssets: any[] = [
    { id: 1, assetId: 'A1', assetTag: 'TAG-1', assetName: 'Laptop' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <RejectDisposalDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Reject Disposal Request')).toBeInTheDocument();
    expect(screen.getByText(/TAG-1/)).toBeInTheDocument();
  });

  it('validates and submits successfully', async () => {
    (rejectDisposalRequest as any).mockResolvedValue({ success: true });

    render(
      <RejectDisposalDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Confirm Rejection' });
    expect(submitBtn).toBeDisabled();

    // Type reason (> 10 chars)
    const reasonInput = screen.getByLabelText(/Rejection Reason/);
    fireEvent.change(reasonInput, {
      target: { value: 'This is a valid long reason' },
    });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(rejectDisposalRequest).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(tiqriToast.success).toHaveBeenCalled();
    });
  });

  it('requires maintenance issue if status is In Repair', async () => {
    render(
      <RejectDisposalDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSuccess={mockOnSuccess}
      />
    );

    // Type reason
    const reasonInput = screen.getByLabelText(/Rejection Reason/);
    fireEvent.change(reasonInput, {
      target: { value: 'This is a valid long reason' },
    });

    // Select In Repair
    fireEvent.click(screen.getByText('Select In Repair'));

    const submitBtn = screen.getByRole('button', { name: 'Confirm Rejection' });

    // Should be disabled because maintenance issue is required
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Type maintenance issue
    const issueInput = screen.getByLabelText(/Maintenance Issue Description/);
    fireEvent.change(issueInput, { target: { value: 'Needs new battery' } });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
