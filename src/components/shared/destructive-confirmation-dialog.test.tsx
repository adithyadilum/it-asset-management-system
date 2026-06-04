import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DestructiveConfirmationDialog } from './destructive-confirmation-dialog';

describe('DestructiveConfirmationDialog', () => {
  const defaultProps = {
    title: 'Delete Item',
    description: 'Are you sure?',
    itemsToDelete: [{ id: '1', name: 'Item 1' }],
    columns: [{ key: 'name', label: 'Name' }],
    onConfirm: vi.fn(),
  };

  it('renders trigger button in uncontrolled mode', () => {
    render(<DestructiveConfirmationDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<DestructiveConfirmationDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    
    render(<DestructiveConfirmationDialog {...defaultProps} open={true} onOpenChange={vi.fn()} onConfirm={onConfirmMock} />);
    
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirmMock).toHaveBeenCalled();
  });

  it('renders error message when canDelete is false', () => {
    render(
      <DestructiveConfirmationDialog 
        {...defaultProps} 
        open={true} 
        onOpenChange={vi.fn()} 
        canDelete={false} 
        errorMessage="Cannot delete item" 
      />
    );
    
    expect(screen.getByText('Cannot delete item')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
