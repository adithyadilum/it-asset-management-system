import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AddUsersToRoleModal } from './add-users-to-role-modal';
import * as roleActions from '@/actions/roles';

vi.mock('@/actions/roles', () => ({
  searchUsers: vi.fn(),
  assignUsersRoleBulk: vi.fn(),
}));

describe('AddUsersToRoleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentUserId="current-1"
        defaultRole="GlobalAdmin"
      />
    );

    expect(
      screen.getAllByText('Assign Users to Global Admin')[0]
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search company directory/i)
    ).toBeInTheDocument();
  });

  it('searches for users when typing', async () => {
    const user = userEvent.setup();
    vi.mocked(roleActions.searchUsers).mockResolvedValue([
      {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        department: 'HR',
        role: 'Employee',
        isActive: true,
      },
    ]);

    render(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentUserId="current-1"
      />
    );

    const input = screen.getByPlaceholderText(/search company directory/i);
    await user.type(input, 'Jane');

    await waitFor(() => {
      expect(roleActions.searchUsers).toHaveBeenCalledWith('Jane');
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  it('disables submit button when no users are mapped', () => {
    render(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentUserId="current-1"
      />
    );

    const submitButton = screen.getByText('Confirm Mapping');
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText('No users selected for this role.')
    ).toBeInTheDocument();
  });
});
