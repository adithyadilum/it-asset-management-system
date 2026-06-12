import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveUserModal } from './remove-user-modal';
import { removeUserFromManagedRole } from '@/actions/roles';

vi.mock('@/actions/roles', () => ({
  removeUserFromManagedRole: vi.fn(),
}));

describe('RemoveUserModal', () => {
  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'ITOperator' as const
  };

  const mockOnOpenChange = vi.fn();
  const mockOnRemoved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<RemoveUserModal isOpen={false} onOpenChange={mockOnOpenChange} user={mockUser} />);
    expect(screen.queryByText(/Remove User from/i)).not.toBeInTheDocument();
  });

  it('renders correctly when isOpen is true', () => {
    render(
      <RemoveUserModal 
        isOpen={true} 
        onOpenChange={mockOnOpenChange} 
        user={mockUser} 
        targetRole="IT Operations"
      />
    );
    
    expect(screen.getByText('Remove User from IT Operations')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('calls onOpenChange with false when cancel is clicked', () => {
    render(
      <RemoveUserModal 
        isOpen={true} 
        onOpenChange={mockOnOpenChange} 
        user={mockUser} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls removeUserFromManagedRole and onRemoved when Remove is clicked', async () => {
    (removeUserFromManagedRole as any).mockResolvedValue({ success: true });
    
    render(
      <RemoveUserModal 
        isOpen={true} 
        onOpenChange={mockOnOpenChange} 
        user={mockUser} 
        onRemoved={mockOnRemoved}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    
    expect(screen.getByRole('button', { name: 'Removing...' })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(removeUserFromManagedRole).toHaveBeenCalledWith('user-1');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnRemoved).toHaveBeenCalled();
    });
  });

  it('displays error message when removal fails', async () => {
    (removeUserFromManagedRole as any).mockResolvedValue({ success: false, error: 'Failed to remove user' });
    
    render(
      <RemoveUserModal 
        isOpen={true} 
        onOpenChange={mockOnOpenChange} 
        user={mockUser} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to remove user')).toBeInTheDocument();
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });
  });

  it('displays default error message on catch block', async () => {
    (removeUserFromManagedRole as any).mockRejectedValue(new Error('Network error'));
    
    render(
      <RemoveUserModal 
        isOpen={true} 
        onOpenChange={mockOnOpenChange} 
        user={mockUser} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to remove user from this role.')).toBeInTheDocument();
    });
  });
});
