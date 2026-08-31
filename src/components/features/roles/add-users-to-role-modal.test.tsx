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
    // Not already an Employee: the modal now always hides directory users who
    // already hold the role being assigned, and 'Employee' is the default.
    vi.mocked(roleActions.searchUsers).mockResolvedValue([
      {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        department: 'HR',
        role: 'ITOperator',
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

  it('hides directory users who already hold the role being assigned', async () => {
    const user = userEvent.setup();
    vi.mocked(roleActions.searchUsers).mockResolvedValue([
      {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        department: 'HR',
        role: 'ITOperator',
        isActive: true,
      },
      {
        id: 'user-2',
        name: 'John Smith',
        email: 'john@example.com',
        department: 'IT',
        role: 'GlobalAdmin',
        isActive: true,
      },
    ]);

    render(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentUserId="current-1"
        defaultRole="GlobalAdmin"
      />
    );

    await user.type(
      screen.getByPlaceholderText(/search company directory/i),
      'o'.repeat(2)
    );

    await waitFor(() => {
      expect(roleActions.searchUsers).toHaveBeenCalled();
    });

    // John is already a GlobalAdmin, so assigning it to him is a no-op.
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
  });

  it('clears the search and selection when closed from the Cancel button', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.mocked(roleActions.searchUsers).mockResolvedValue([
      {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        department: 'HR',
        role: 'ITOperator',
        isActive: true,
      },
    ]);

    const { rerender } = render(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={onOpenChange}
        currentUserId="current-1"
      />
    );

    const input = screen.getByPlaceholderText(/search company directory/i);
    await user.type(input, 'Jane');
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Cancel, the header X and the close after a successful assign all used to
    // call onOpenChange directly, skipping the reset -- so reopening still
    // showed the previous search and selection.
    await user.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <AddUsersToRoleModal
        isOpen={false}
        onOpenChange={onOpenChange}
        currentUserId="current-1"
      />
    );
    rerender(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={onOpenChange}
        currentUserId="current-1"
      />
    );

    expect(
      screen.getByPlaceholderText(/search company directory/i)
    ).toHaveValue('');
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('disables submit button when no users are mapped', () => {
    render(
      <AddUsersToRoleModal
        isOpen={true}
        onOpenChange={vi.fn()}
        currentUserId="current-1"
      />
    );

    const submitButton = screen.getByText('Assign');
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText('No users selected. Search above to add users.')
    ).toBeInTheDocument();
  });
});
