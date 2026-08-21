import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignmentsPanels } from './assignments-panels';
import {
  getAssetDetailsByIdAction,
  getAssetMaintenanceByIdAction,
} from '@/actions/asset-registry-panels';
import {
  sendAssignmentReminderAction,
  requestAssetReturnAction,
  markAssetReceivedAction,
} from '@/actions/assignments';

// Mock the actions
vi.mock('@/actions/asset-registry-panels', () => ({
  getAssetDetailsByIdAction: vi.fn(),
  getAssetMaintenanceByIdAction: vi.fn(),
}));

vi.mock('@/actions/assignments', () => ({
  sendAssignmentReminderAction: vi.fn(),
  requestAssetReturnAction: vi.fn(),
  markAssetReceivedAction: vi.fn(),
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components
vi.mock(
  '@/components/features/asset-registry/panels/asset-assignment-panel',
  () => ({
    AssetAssignmentDetailsPanel: ({
      assetName,
      onAssign,
      onSendReminder,
      onRequestReturn,
      onMarkReceived,
    }: any) => (
      <div data-testid="asset-assignment-details-panel">
        <h1>{assetName}</h1>
        <button onClick={onAssign}>Assign</button>
        <button onClick={onSendReminder}>Send Reminder</button>
        <button onClick={onRequestReturn}>Request Return</button>
        <button onClick={onMarkReceived}>Mark Received</button>
      </div>
    ),
  })
);

vi.mock('./asset-assignment-modal', () => ({
  AssetAssignmentModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="asset-assignment-modal">Modal Open</div> : null,
}));

describe('AssignmentsPanels', () => {
  const mockAsset = {
    assetId: '123',
    assetTag: 'TAG-123',
    assetName: 'Test Asset',
    category: 'Laptop',
    model: 'Pro',
    brand: 'Apple',
    serialNumber: 'SN123',
    owner: 'Company',
    assignedTo: 'John',
    group: 'Hardware',
    dateCreated: '2023-01-01',
    updatedAt: '2023-01-01',
    warranty: '',
    note: '',
    status: 'Assigned',
    state: 'assigned',
    assignmentId: 101,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (getAssetDetailsByIdAction as any).mockResolvedValue({
      success: true,
      data: { model: { name: 'Pro Max', brand: { name: 'Apple' } } },
    });

    (getAssetMaintenanceByIdAction as any).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  const renderPanel = (props = {}) => {
    return render(
      <AssignmentsPanels
        isOpen={true}
        selectedAsset={mockAsset}
        onClose={mockOnClose}
        {...props}
      />
    );
  };

  it('renders null if no asset selected', () => {
    const { container } = renderPanel({ selectedAsset: null });
    expect(container.firstChild).toBeNull();
  });

  it('fetches details and maintenance data when opened', async () => {
    renderPanel();

    expect(getAssetDetailsByIdAction).toHaveBeenCalledWith('123');
    expect(getAssetMaintenanceByIdAction).toHaveBeenCalledWith('123');

    expect(
      screen.getByTestId('asset-assignment-details-panel')
    ).toBeInTheDocument();
  });

  it('handles assignment actions correctly', async () => {
    (sendAssignmentReminderAction as any).mockResolvedValue({ success: true });
    (requestAssetReturnAction as any).mockResolvedValue({ success: true });
    (markAssetReceivedAction as any).mockResolvedValue({ success: true });

    renderPanel();

    // Test Assign
    fireEvent.click(screen.getByText('Assign'));
    expect(screen.getByTestId('asset-assignment-modal')).toBeInTheDocument();

    // Test Send Reminder
    fireEvent.click(screen.getByText('Send Reminder'));
    await waitFor(() => {
      expect(sendAssignmentReminderAction).toHaveBeenCalledWith([101]);
    });

    // Test Request Return
    fireEvent.click(screen.getByText('Request Return'));
    await waitFor(() => {
      expect(requestAssetReturnAction).toHaveBeenCalledWith([101]);
    });

    // Test Mark Received
    fireEvent.click(screen.getByText('Mark Received'));
    await waitFor(() => {
      expect(markAssetReceivedAction).toHaveBeenCalledWith([101]);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
