import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolveInternallyDialog } from './resolve-internally-dialog';

describe('ResolveInternallyDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (props = {}) => {
    return render(
      <ResolveInternallyDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        {...props}
      />
    );
  };

  it('renders correctly', () => {
    renderDialog();
    expect(screen.getByText('Resolve Issue Internally')).toBeInTheDocument();
    expect(screen.getByLabelText(/Resolution Note/i)).toBeInTheDocument();
  });

  it('disables submit button when note is empty', () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', {
      name: 'Resolve Internally',
    });
    expect(submitBtn).toBeDisabled();
  });

  it('submits correctly when note is entered', async () => {
    renderDialog();

    const noteInput = screen.getByPlaceholderText(
      'Describe how the issue was resolved...'
    );
    fireEvent.change(noteInput, { target: { value: 'Fixed software glitch' } });

    const submitBtn = screen.getByRole('button', {
      name: 'Resolve Internally',
    });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('Fixed software glitch');
    });
  });

  it('shows error if submission fails', async () => {
    mockOnConfirm.mockRejectedValueOnce(new Error('Network error'));

    renderDialog();

    const noteInput = screen.getByPlaceholderText(
      'Describe how the issue was resolved...'
    );
    fireEvent.change(noteInput, { target: { value: 'Fixed software glitch' } });

    const submitBtn = screen.getByRole('button', {
      name: 'Resolve Internally',
    });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});
