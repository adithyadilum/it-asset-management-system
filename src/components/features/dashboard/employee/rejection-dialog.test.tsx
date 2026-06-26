import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RejectionDialog } from './rejection-dialog';
import { rejectAssignmentAction } from '@/actions/employee';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock('@/actions/employee', () => ({
  rejectAssignmentAction: vi.fn().mockResolvedValue({ success: true })
}));

describe('RejectionDialog', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('requires reason and calls rejectAssignmentAction', async () => {
    const mockOnSuccess = vi.fn();
    const mockAssignment = {
      assignmentId: 'a1',
      assetId: '1',
      assetTag: 'AST-1',
      assetName: 'MacBook Pro',
      assignedDate: '2023-01-01',
      status: 'pending'
    };

    render(<CurrencyProvider initialCurrency="USD">
      <RejectionDialog 
        isOpen={true} 
        onOpenChange={vi.fn()} 
        assignment={mockAssignment as any}
        onSuccess={mockOnSuccess}
      />
    </CurrencyProvider>);
    
    const confirmBtn = screen.getByRole('button', { name: /Submit Report/i });
    
    // Typing into the reason text area
    const input = screen.getByPlaceholderText(/Explain why/i);
    fireEvent.change(input, { target: { value: 'Already have one' } });
    
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(rejectAssignmentAction).toHaveBeenCalledWith('a1', 'Already have one');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
