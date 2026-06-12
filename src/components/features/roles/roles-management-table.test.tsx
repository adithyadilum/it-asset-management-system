import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RolesManagementTable } from './roles-management-table';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// We only need to mock the external data-table if it uses ResizeObserver or features that crash in JSDOM,
// but usually @tanstack/react-table with simple UI works fine. We mock the remove modal.
vi.mock('./remove-user-modal', () => ({
  RemoveUserModal: ({ isOpen, onOpenChange, user }: any) => (
    isOpen ? (
      <div data-testid="mock-remove-modal">
        Remove Mock Modal for {user?.name}
        <button onClick={() => onOpenChange(false)}>Close Mock</button>
      </div>
    ) : null
  ),
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
    },
    {
      id: '2',
      name: 'Bob Jones',
      email: 'bob@example.com',
      department: 'Finance',
      role: 'ITOperator' as const,
    }
  ];

  it('renders the table with user data', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="3"
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
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove .* from IT Operator/i });
    // Assuming buttons are rendered in order
    expect(removeButtons[0]).toBeDisabled(); // Alice (id=1)
    expect(removeButtons[1]).not.toBeDisabled(); // Bob (id=2)
  });

  it('opens the remove modal when remove is clicked', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });

    render(
      <RolesManagementTable
        users={mockUsers}
        roleLabel="IT Operator"
        currentUserId="3"
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove .* from IT Operator/i });
    fireEvent.click(removeButtons[0]); // Click Alice's remove button

    expect(screen.getByTestId('mock-remove-modal')).toBeInTheDocument();
    expect(screen.getByText(/Remove Mock Modal for Alice Smith/)).toBeInTheDocument();
  });
});
