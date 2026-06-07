import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRoleAssignmentModal } from './user-role-assignment-modal';
import { assignUserRole, assignUsersRoleBulk, searchUsers } from '@/actions/roles';

vi.mock('@/actions/roles', () => ({
  assignUserRole: vi.fn(),
  assignUsersRoleBulk: vi.fn(),
  searchUsers: vi.fn(),
}));

describe('UserRoleAssignmentModal', () => {
  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering',
    role: 'Employee' as const,
  };

  const mockMappedUsers = [
    {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      department: 'Finance',
      role: 'ITOperator' as const,
    }
  ];

  const mockOnOpenChange = vi.fn();
  const mockOnUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Add Mode', () => {
    it('renders search input and allows searching', async () => {
      (searchUsers as any).mockResolvedValue([mockUser]);

      render(
        <UserRoleAssignmentModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          user={null}
          mode="add"
          defaultRole="ITOperator"
          mappedUsers={mockMappedUsers}
          currentUserId="admin-1"
        />
      );

      expect(screen.getAllByText(/Assign Users to\s*IT Operations/i).length).toBeGreaterThan(0);
      
      const searchInput = screen.getByPlaceholderText(/Search company directory/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(searchUsers).toHaveBeenCalledWith('John');
      });
      
      // Should show the user in search results
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('adds a user to the selection and submits', async () => {
      (searchUsers as any).mockResolvedValue([mockUser]);
      (assignUsersRoleBulk as any).mockResolvedValue({ success: true });

      render(
        <UserRoleAssignmentModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          user={null}
          mode="add"
          defaultRole="ITOperator"
          mappedUsers={mockMappedUsers}
          currentUserId="admin-1"
          onUpdated={mockOnUpdated}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search company directory/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Instead of relying on the index of all buttons, let's find the button within the search result container
      const userResult = screen.getByText('John Doe').closest('div.flex.items-center.justify-between');
      if (userResult) {
        const btn = userResult.querySelector('button');
        if (btn) fireEvent.click(btn);
      } else {
        // Fallback
        const btns = screen.getAllByRole('button');
        fireEvent.click(btns[btns.length - 3]);
      }

      // Confirm Mapping
      const confirmButton = screen.getByRole('button', { name: 'Confirm Mapping' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(assignUsersRoleBulk).toHaveBeenCalledWith(['user-1'], 'ITOperator');
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(mockOnUpdated).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders current user details and allows role change', async () => {
      (assignUserRole as any).mockResolvedValue({ success: true });

      render(
        <UserRoleAssignmentModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          mode="edit"
          currentUserId="admin-1"
          onUpdated={mockOnUpdated}
        />
      );

      expect(screen.getAllByText('Change User Role').length).toBeGreaterThan(0);
      
      const roleSelect = screen.getByLabelText('Role');
      expect((roleSelect as HTMLSelectElement).value).toBe('Employee');

      fireEvent.change(roleSelect, { target: { value: 'ITOperator' } });
      
      const updateButton = screen.getByRole('button', { name: 'Update Role' });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(assignUserRole).toHaveBeenCalledWith('user-1', 'ITOperator');
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(mockOnUpdated).toHaveBeenCalled();
      });
    });

    it('prevents editing own role', () => {
      render(
        <UserRoleAssignmentModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          mode="edit"
          currentUserId="user-1" // Same as user id
        />
      );

      const roleSelect = screen.getByLabelText('Role');
      expect(roleSelect).toBeDisabled();

      const updateButton = screen.getByRole('button', { name: 'Update Role' });
      expect(updateButton).toBeDisabled();

      expect(screen.getByText('You cannot modify your own role.')).toBeInTheDocument();
    });
  });
});
