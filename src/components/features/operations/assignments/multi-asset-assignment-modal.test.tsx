import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiAssetAssignmentModal } from './multi-asset-assignment-modal';
import { bulkAssignAssetsAction } from '@/actions/assignments';
import { searchUsers } from '@/actions/users';
import { searchLocations } from '@/actions/locations';
import { useRouter } from 'next/navigation';

vi.mock('@/actions/assignments', () => ({
  bulkAssignAssetsAction: vi.fn(),
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

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

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

describe('MultiAssetAssignmentModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockRouterRefresh = vi.fn();

  const mockAssets = [
    {
      assetId: '1',
      assetTag: 'TAG-1',
      assetName: 'Laptop 1',
      assetGroup: 'Hardware',
    },
    {
      assetId: '2',
      assetTag: 'TAG-2',
      assetName: 'Laptop 2',
      assetGroup: 'Hardware',
    },
  ];

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      refresh: mockRouterRefresh,
    });

    (searchUsers as any).mockResolvedValue({
      success: true,
      data: [{ id: 'user-1', name: 'John Doe' }],
    });

    (searchLocations as any).mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'Headquarters' }],
    });
  });

  const renderModal = (props = {}) => {
    return render(
      <MultiAssetAssignmentModal
        isOpen={true}
        assets={mockAssets}
        onOpenChange={mockOnOpenChange}
        {...props}
      />
    );
  };

  it('renders correctly', async () => {
    renderModal();

    expect(screen.getAllByText(/Assign 2 Assets/)[0]).toBeInTheDocument();
    expect(screen.getByText('TAG-1')).toBeInTheDocument();
    expect(screen.getByText('TAG-2')).toBeInTheDocument();

    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalled();
    });
  });

  it('submits bulk assignment correctly', async () => {
    (bulkAssignAssetsAction as any).mockResolvedValue({
      success: true,
      count: 2,
    });

    renderModal();

    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalled();
    });

    const selects = screen.getAllByRole('combobox');
    const userSelect = selects[0]; // The first combobox is the assignee select
    fireEvent.click(userSelect);

    const option = await screen.findByRole('option', { name: 'John Doe' });
    fireEvent.click(option);

    // Add notes
    const notesTextarea = screen.getByPlaceholderText(
      'Add any additional Notes'
    );
    fireEvent.change(notesTextarea, {
      target: { value: 'Bulk assignment test' },
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Assign 2 Assets/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bulkAssignAssetsAction).toHaveBeenCalledWith({
        assetIds: ['1', '2'],
        assignmentType: 'user',
        targetId: 'user-1',
        expectedReturnDate: undefined,
        notes: 'Bulk assignment test',
      });
      expect(mockRouterRefresh).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('disables location assignment when a software asset is included in selection', () => {
    renderModal({
      assets: [
        ...mockAssets,
        {
          assetId: '3',
          assetTag: 'TAG-3',
          assetName: 'Software License',
          assetGroup: 'Software',
        },
      ],
    });

    const userRadio = screen.getByLabelText(
      'Assign to User'
    ) as HTMLInputElement;
    const locationRadio = screen.getByLabelText(
      'Assign to Location'
    ) as HTMLInputElement;

    expect(userRadio.disabled).toBe(false);
    expect(userRadio.checked).toBe(true);
    expect(locationRadio.disabled).toBe(true);
    expect(
      screen.getByRole('button', { name: /Assign 3 Assets/ })
    ).toBeEnabled();
  });

  it('disables user assignment and defaults to location assignment when Office assets are selected', () => {
    renderModal({
      assets: [
        {
          assetId: '3',
          assetTag: 'TAG-3',
          assetName: 'Chair',
          assetGroup: 'Office Furniture',
        },
        {
          assetId: '4',
          assetTag: 'TAG-4',
          assetName: 'Monitor',
          assetGroup: 'Office Electronics',
        },
      ],
    });

    const userRadio = screen.getByLabelText(
      'Assign to User'
    ) as HTMLInputElement;
    const locationRadio = screen.getByLabelText(
      'Assign to Location'
    ) as HTMLInputElement;

    expect(userRadio.disabled).toBe(true);
    expect(locationRadio.disabled).toBe(false);
    expect(locationRadio.checked).toBe(true);
    expect(
      screen.getByRole('button', { name: /Assign 2 Assets/ })
    ).toBeEnabled();
  });
});
