import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetAssignmentModal } from './asset-assignment-modal';
import { assignAssetAction } from '@/actions/assignments';
import { searchUsers } from '@/actions/users';
import { searchLocations } from '@/actions/locations';
import { useRouter } from 'next/navigation';

// Mock the actions
vi.mock('@/actions/assignments', () => ({
  assignAssetAction: vi.fn(),
}));

vi.mock('@/actions/users', () => ({
  searchUsers: vi.fn(),
}));

vi.mock('@/actions/locations', () => ({
  searchLocations: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Sonner toast
vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock the SearchableDropdown component
vi.mock('@/components/ui/searchable-dropdown', () => ({
  SearchableDropdown: ({ options, value, onSelect, placeholder }: any) => (
    <div data-testid="searchable-dropdown">
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        aria-label={placeholder}
      >
        <option value="">Select an option</option>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

describe('AssetAssignmentModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockRouterRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      refresh: mockRouterRefresh,
    });

    // Default successful responses for options
    (searchUsers as any).mockResolvedValue({
      success: true,
      data: [
        { id: 'user-1', name: 'John Doe' },
        { id: 'user-2', name: 'Jane Smith' },
      ],
    });

    (searchLocations as any).mockResolvedValue({
      success: true,
      data: [
        { id: 1, name: 'Headquarters' },
        { id: 2, name: 'Branch Office' },
      ],
    });
  });

  const renderModal = (props = {}) => {
    return render(
      <AssetAssignmentModal
        isOpen={true}
        assetId="asset-1"
        assetLabel="MacBook Pro"
        assetGroup="Laptop"
        onOpenChange={mockOnOpenChange}
        {...props}
      />
    );
  };

  it('renders correctly with default props', async () => {
    renderModal();

    expect(screen.getByText('Assign Asset:')).toBeInTheDocument();
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();

    // Both user and location options should be available
    expect(screen.getByLabelText('Assign to User')).toBeInTheDocument();
    expect(screen.getByLabelText('Assign to Location')).toBeInTheDocument();

    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalled();
      expect(searchLocations).toHaveBeenCalled();
    });
  });

  it('disables user assignment for Office Furniture', async () => {
    renderModal({ assetGroup: 'Office Furniture' });

    const userRadio = screen.getByLabelText(
      'Assign to User'
    ) as HTMLInputElement;
    expect(userRadio.disabled).toBe(true);

    const locationRadio = screen.getByLabelText(
      'Assign to Location'
    ) as HTMLInputElement;
    expect(locationRadio.checked).toBe(true);
  });

  it('submits assignment to a user correctly', async () => {
    (assignAssetAction as any).mockResolvedValue({ success: true });

    renderModal();

    // Wait for options to load
    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalled();
    });

    // Select user mode (default for non-furniture)
    const userRadio = screen.getByLabelText(
      'Assign to User'
    ) as HTMLInputElement;
    expect(userRadio.checked).toBe(true);

    const dropdown = screen.getByTestId('searchable-dropdown');
    const select = dropdown.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'user-1' } });

    // Add notes
    const notesTextarea = screen.getByPlaceholderText(
      'Add any additional notes'
    );
    fireEvent.change(notesTextarea, { target: { value: 'Test note' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Assign Asset' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignAssetAction).toHaveBeenCalledWith({
        assetId: 'asset-1',
        assignmentType: 'user',
        targetId: 'user-1',
        expectedReturnDate: undefined,
        notes: 'Test note',
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
