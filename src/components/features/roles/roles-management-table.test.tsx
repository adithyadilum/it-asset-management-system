import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RolesManagementTable } from './roles-management-table';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('./remove-user-modal', () => ({
  RemoveUserModal: ({ isOpen, onOpenChange, user }: any) =>
    isOpen ? (
      <div data-testid="mock-remove-modal">
        Remove Mock Modal for {user?.name}
        <button onClick={() => onOpenChange(false)}>Close Mock</button>
      </div>
    ) : null,
}));

vi.mock('./add-users-to-role-modal', () => ({
  AddUsersToRoleModal: ({ isOpen, onOpenChange }: any) =>
    isOpen ? (
      <div data-testid="mock-add-modal">
        Add User Mock Modal
        <button onClick={() => onOpenChange(false)}>Close Mock</button>
      </div>
    ) : null,
}));

vi.mock('./edit-user-role-modal', () => ({
  EditUserRoleModal: ({ isOpen, onOpenChange, user }: any) =>
    isOpen ? (
      <div data-testid="mock-edit-modal">
        Edit User Role Mock Modal for {user?.name}
        <button onClick={() => onOpenChange(false)}>Close Mock</button>
      </div>
    ) : null,
}));

describe('RolesManagementTable', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockUsers = [
    {
      id: '1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      department: 'IT',
      role: 'ITOperator' as const,
      isActive: true,
    },
    {
      id: '2',
      name: 'Bob Jones',
      email: 'bob@example.com',
      department: 'Finance',
      role: 'ITOperator' as const,
      isActive: true,
    },
  ];

  it('renders the table with user data', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="3"
        selectedRole="ITOperator"
      />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('disables the remove button for the current user', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="1"
        selectedRole="ITOperator"
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: /Remove .* from IT Operator/i,
    });
    // Assuming buttons are rendered in order
    expect(removeButtons[0]).toBeDisabled(); // Alice (id=1)
    expect(removeButtons[1]).not.toBeDisabled(); // Bob (id=2)

    const editButtons = screen.getAllByRole('button', {
      name: /Change role for/i,
    });
    expect(editButtons[0]).toBeDisabled(); // Alice (id=1)
    expect(editButtons[1]).not.toBeDisabled(); // Bob (id=2)
  });

  it('opens the remove modal when remove is clicked', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="3"
        selectedRole="ITOperator"
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: /Remove .* from IT Operator/i,
    });
    fireEvent.click(removeButtons[0]); // Click Alice's remove button

    expect(screen.getByTestId('mock-remove-modal')).toBeInTheDocument();
    expect(
      screen.getByText(/Remove Mock Modal for Alice Smith/)
    ).toBeInTheDocument();
  });

  it('opens the assignment modal when Add User is clicked', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="3"
        selectedRole="ITOperator"
      />
    );

    const addButton = screen.getByRole('button', { name: /Add User/i });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);
    expect(screen.getByTestId('mock-add-modal')).toBeInTheDocument();
  });

  it('does not render the Add User button when selectedRole is Employee', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="Employee"
        currentUserId="3"
        selectedRole="Employee"
      />
    );

    const addButton = screen.queryByRole('button', { name: /Add User/i });
    expect(addButton).not.toBeInTheDocument();
  });

  it('renders edit but not remove action buttons when selectedRole is Employee', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="Employee"
        currentUserId="3"
        selectedRole="Employee"
      />
    );

    const editButtons = screen.queryAllByRole('button', {
      name: /Change role for/i,
    });
    expect(editButtons).toHaveLength(2);

    const removeButtons = screen.queryAllByRole('button', {
      name: /Remove .* from Employee/i,
    });
    expect(removeButtons).toHaveLength(0);
  });

  it('opens the edit modal when edit is clicked', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="3"
        selectedRole="ITOperator"
      />
    );

    const editButtons = screen.getAllByRole('button', {
      name: /Change role for/i,
    });
    fireEvent.click(editButtons[0]); // Click Alice's edit button

    expect(screen.getByTestId('mock-edit-modal')).toBeInTheDocument();
    expect(
      screen.getByText(/Edit User Role Mock Modal for Alice Smith/)
    ).toBeInTheDocument();
  });
});
