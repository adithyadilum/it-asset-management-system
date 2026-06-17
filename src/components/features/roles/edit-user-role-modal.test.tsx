import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditUserRoleModal } from './edit-user-role-modal';
import * as roleActions from '@/actions/roles';

// Mock the actions
vi.mock('@/actions/roles', () => ({
  assignUserRole: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  department: 'IT',
  role: 'Employee' as const,
};

describe('EditUserRoleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText('Update Role')).toBeInTheDocument();
  });

  it('calls assignUserRole when submitted', async () => {
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

    const updateButton = screen.getByText('Update Role');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(roleActions.assignUserRole).toHaveBeenCalledWith('user-1', 'Employee');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('disables update button if user is modifying their own role', () => {
    render(
      <EditUserRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        user={mockUser}
        currentUserId="user-1"
      />
    );

    const updateButton = screen.getByText('Update Role');
    expect(updateButton).toBeDisabled();
    expect(screen.getByText('You cannot modify your own role.')).toBeInTheDocument();
  });
});
