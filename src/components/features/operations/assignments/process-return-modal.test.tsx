import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessReturnModal } from './process-return-modal';
import { processAssetReturnAction } from '@/actions/assignments';
import { useRouter } from 'next/navigation';

vi.mock('@/actions/assignments', () => ({
  processAssetReturnAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('ProcessReturnModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockRouterRefresh = vi.fn();
  
  const mockAsset = {
    assetId: 'asset-1',
    assetTag: 'TAG-123',
    assetName: 'MacBook Pro',
    assignee: 'John Doe',
    assignmentId: 101,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      refresh: mockRouterRefresh,
    });
  });

  const renderModal = (props = {}) => {
    return render(
      <ProcessReturnModal
        isOpen={true}
        asset={mockAsset}
        onOpenChange={mockOnOpenChange}
        {...props}
      />
    );
  };

  it('renders correctly', () => {
    renderModal();
    
    expect(screen.getByText(/Process Return:/)).toBeInTheDocument();
    expect(screen.getByText(/MacBook Pro/)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('submits return correctly', async () => {
    (processAssetReturnAction as any).mockResolvedValue({ success: true });
    
    renderModal();
    
    const conditionRadio = screen.getByLabelText('Good Working Condition');
    fireEvent.click(conditionRadio);
    
    // Add notes
    const notesTextarea = screen.getByPlaceholderText('E.g., Screen is heavily scratched...');
    fireEvent.change(notesTextarea, { target: { value: 'Looks fine' } });
    
    const submitBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(processAssetReturnAction).toHaveBeenCalledWith({
        assetId: 'asset-1',
        condition: 'Good Working Condition',
        notes: 'Looks fine'
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('requires condition to be selected', async () => {
    renderModal();
    
    const submitBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(submitBtn);
    
    // It should not call the action if condition is empty
    expect(processAssetReturnAction).not.toHaveBeenCalled();
  });
});
