
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { ExecuteDisposalDialog } from './execute-disposal-dialog';
import { executeAssetDisposal } from '@/actions/disposals/execute';

vi.mock('@/actions/disposals/execute', () => ({
  executeAssetDisposal: vi.fn(),
}));

vi.mock('@/actions/disposals/upload-receipt', () => ({
  uploadDisposalReceipt: vi.fn(),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/shared/file-upload-zone', () => ({
  FileUploadZone: ({ onUploadSuccess }: any) => (
    <div data-testid="upload-zone">
      <button onClick={() => onUploadSuccess('http://example.com/receipt.pdf')}>
        Simulate Upload
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select-mock" data-value={value}>
      {children}
      <button onClick={() => onValueChange('Defective')}>Select Defective</button>
      <button onClick={() => onValueChange('E-waste')}>Select E-waste</button>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
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

describe('ExecuteDisposalDialog', () => {
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
    { id: 1, assetId: 'A1', assetTag: 'TAG-1', assetName: 'Laptop', flaggedBy: 'User A', requestedAt: new Date() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <ExecuteDisposalDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Dispose Asset')).toBeInTheDocument();
    expect(screen.getAllByText(/TAG-1/)[0]).toBeInTheDocument();
  });

  it('validates required fields before allowing submit', async () => {
    render(
      <ExecuteDisposalDialog
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedAssets={mockAssets}
        onSuccess={mockOnSuccess}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Execute Disposal' });
    expect(confirmBtn).toBeDisabled();

    // Check checkboxes
    fireEvent.click(screen.getByLabelText(/Data wiped/));
    fireEvent.click(screen.getByLabelText(/All physical TIQRI asset tags removed/));

    // Upload receipt
    fireEvent.click(screen.getByText('Simulate Upload'));
    
    // Select reason
    fireEvent.click(screen.getAllByText('Select Defective')[0]);

    fireEvent.click(screen.getAllByText('Select E-waste')[1]);

    // Type confirmation text
    const input = screen.getByPlaceholderText('TAG-1');
    fireEvent.change(input, { target: { value: 'TAG-1' } });

    await waitFor(() => {
      expect(confirmBtn).not.toBeDisabled();
    });

    (executeAssetDisposal as any).mockResolvedValue({ success: true });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(executeAssetDisposal).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
