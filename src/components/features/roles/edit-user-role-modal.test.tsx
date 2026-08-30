import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditUserRoleModal } from './edit-user-role-modal';
import * as roleActions from '@/actions/roles';

// Mock the actions
vi.mock('@/actions/roles', () => ({
  assignUserRole: vi.fn(),
  setUserActiveStatus: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  department: 'IT',
  role: 'Employee' as const,
  isActive: true,
};

describe('EditUserRoleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders correctly when open', () => {
    render(
      <EditUserRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        currentUserId="current-1"
      />
    );
    expect(screen.getAllByText('Change User Role')[0]).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('calls assignUserRole when submitted with changed role', async () => {
    const onOpenChange = vi.fn();
    const onUpdated = vi.fn();
    vi.mocked(roleActions.assignUserRole).mockResolvedValue({ success: true });

    render(
      <EditUserRoleModal
        isOpen={true}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
        user={mockUser}
        currentUserId="current-1"
      />
    );

    const roleSelect = screen.getByLabelText('Role');
    fireEvent.click(roleSelect);

    const newRoleOption = await screen.findByText('IT Operator');
    fireEvent.click(newRoleOption);

    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(roleActions.assignUserRole).toHaveBeenCalledWith(
        'user-1',
        'ITOperator'
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  // Activating/deactivating a user moved to the toggle on the roles table;
  // this modal only changes the role now. Coverage for the status action lives
  // in roles-management-table.test.tsx.

  it('disables update button if user is modifying their own role', () => {
    render(
      <EditUserRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        currentUserId="user-1"
      />
    );

    const updateButton = screen.getByText('Update');
    expect(updateButton).toBeDisabled();
    expect(
      screen.getByText('You cannot modify your own role.')
    ).toBeInTheDocument();
  });
});
