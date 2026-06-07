import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RolesAddUserButton } from './roles-add-user-button';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the child component to isolate the test to the button itself
vi.mock('./user-role-assignment-modal', () => ({
  UserRoleAssignmentModal: ({ isOpen, onOpenChange }: any) => (
    isOpen ? (
      <div data-testid="mock-modal">
        Mock Modal 
        <button onClick={() => onOpenChange(false)}>Close Mock</button>
      </div>
    ) : null
  ),
}));

describe('RolesAddUserButton', () => {
  it('renders the button correctly', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });
    
    render(
      <RolesAddUserButton 
        selectedRole="ITOperator" 
        mappedUsers={[]} 
        currentUserId="123" 
      />
    );
    
    expect(screen.getByRole('button', { name: /Add User/i })).toBeInTheDocument();
  });

  it('opens the modal when clicked', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });
    
    render(
      <RolesAddUserButton 
        selectedRole="ITOperator" 
        mappedUsers={[]} 
        currentUserId="123" 
      />
    );
    
    const button = screen.getByRole('button', { name: /Add User/i });
    fireEvent.click(button);
    
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
  });

  it('closes the modal when onOpenChange is called with false in the modal', () => {
    (useRouter as any).mockReturnValue({ refresh: vi.fn() });
    
    render(
      <RolesAddUserButton 
        selectedRole="ITOperator" 
        mappedUsers={[]} 
        currentUserId="123" 
      />
    );
    
    // Open
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();

    // Close
    fireEvent.click(screen.getByText('Close Mock'));
    expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
  });
});
