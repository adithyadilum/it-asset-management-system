import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveStatusBadge } from './interactive-status-badge';
import { manualStatusOverrideAction } from '@/actions/assets';
import { tiqriToast } from '@/components/shared/sonner';

vi.mock('@/actions/assets', () => ({
  manualStatusOverrideAction: vi.fn(),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InteractiveStatusBadge', () => {
  const mockAvailableStatuses = [
    { value: 'Available', label: 'Available' },
    { value: 'In Repair', label: 'In Repair' },
    { value: 'Lost', label: 'Lost' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a locked badge for Disposed status', () => {
    render(
      <InteractiveStatusBadge 
        assetId="AST-1" 
        currentStatus="Disposed" 
        availableStatuses={mockAvailableStatuses} 
      />
    );
    
    // It should render just the StatusBadge, no chevron/dropdown trigger
    expect(screen.getByText('Disposed')).toBeInTheDocument();
    // Dropdown trigger role or chevron shouldn't be present
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens dropdown and displays other available statuses', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveStatusBadge 
        assetId="AST-1" 
        currentStatus="Available" 
        availableStatuses={mockAvailableStatuses} 
      />
    );

    const trigger = screen.getByText('Available');
    await user.click(trigger);

    // Dropdown items
    expect(screen.getByText('In Repair')).toBeInTheDocument();
    expect(screen.getByText('Lost')).toBeInTheDocument();
    
    // Current status shouldn't be in the dropdown
    const availableItems = screen.getAllByText('Available');
    expect(availableItems.length).toBe(1); // Only the trigger, not the menu item
  });

  it('opens modal on status selection', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveStatusBadge 
        assetId="AST-1" 
        currentStatus="Available" 
        availableStatuses={mockAvailableStatuses} 
      />
    );

    await user.click(screen.getByText('Available'));
    await user.click(screen.getByText('In Repair'));

    // Modal should be open
    expect(screen.getByText('Update Asset Status')).toBeInTheDocument();
    expect(screen.getByText('Confirm Override')).toBeDisabled(); // Disabled because text is too short
  });

  it('shows assignment warning if hasActiveAssignment is true', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveStatusBadge 
        assetId="AST-1" 
        currentStatus="Available" 
        availableStatuses={mockAvailableStatuses} 
        hasActiveAssignment={true}
      />
    );

    await user.click(screen.getByText('Available'));
    await user.click(screen.getByText('Lost'));

    expect(screen.getByText(/This asset is currently assigned/i)).toBeInTheDocument();
  });

  it('submits form and calls server action with justification', async () => {
    const user = userEvent.setup();
    const onStatusChangedMock = vi.fn();
    vi.mocked(manualStatusOverrideAction).mockResolvedValue({ success: true, message: 'Updated' });

    render(
      <InteractiveStatusBadge 
        assetId="AST-1" 
        currentStatus="Available" 
        availableStatuses={mockAvailableStatuses} 
        onStatusChanged={onStatusChangedMock}
      />
    );

    // Open dropdown -> select In Repair -> Modal opens
    await user.click(screen.getByText('Available'));
    await user.click(screen.getByText('In Repair'));

    // Fill textarea (requires >= 10 chars)
    const textarea = screen.getByRole('textbox', { name: /justification/i });
    await user.type(textarea, 'Screen is shattered');

    const confirmButton = screen.getByRole('button', { name: 'Confirm Override' });
    expect(confirmButton).toBeEnabled();
    
    await user.click(confirmButton);

    await waitFor(() => {
      expect(manualStatusOverrideAction).toHaveBeenCalledWith('AST-1', 'In Repair', 'Screen is shattered');
    });
    
    expect(tiqriToast.success).toHaveBeenCalledWith('Updated');
    expect(onStatusChangedMock).toHaveBeenCalledWith('In Repair');
    
    // Status should be updated locally
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByText('In Repair')[0]).toBeInTheDocument();
  });

  it('shows error toast on server action failure', async () => {
    const user = userEvent.setup();
    vi.mocked(manualStatusOverrideAction).mockResolvedValue({ success: false, message: 'Override failed' });

    render(
      <InteractiveStatusBadge 
        assetId="AST-1" 
        currentStatus="Available" 
        availableStatuses={mockAvailableStatuses} 
      />
    );

    await user.click(screen.getByText('Available'));
    await user.click(screen.getByText('In Repair'));

    const textarea = screen.getByRole('textbox', { name: /justification/i });
    await user.type(textarea, 'Valid Reason');

    const confirmButton = screen.getByRole('button', { name: 'Confirm Override' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(tiqriToast.error).toHaveBeenCalledWith('Override failed');
    });
  });
});
