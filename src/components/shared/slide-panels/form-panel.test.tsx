import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FormPanel } from './form-panel';

describe('FormPanel', () => {
  const defaultProps = {
    isOpen: true,
    disableTransition: true,
    onClose: vi.fn(),
    title: 'Edit Asset',
    onSubmit: vi.fn((e) => e.preventDefault()),
  };

  it('renders title and children when open', () => {
    render(
      <FormPanel {...defaultProps}>
        <input name="test" placeholder="Test Input" />
      </FormPanel>
    );
    expect(screen.getByText('Edit Asset')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test Input')).toBeInTheDocument();
  });

  it('shows submitting state', () => {
    render(
      <FormPanel
        {...defaultProps}
        isSubmitting={true}
        submittingLabel="Saving..."
      />
    );
    const submitBtn = screen.getByRole('button', {
      name: 'Saving...',
      hidden: true,
    });
    expect(submitBtn).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Cancel', hidden: true })
    ).toBeDisabled();
  });

  it('renders fallback when no children are provided', () => {
    render(<FormPanel {...defaultProps} />);
    expect(screen.getByText(/Add form fields as children/)).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    render(<FormPanel {...defaultProps} onClose={onCloseMock} />);
    await user.click(
      screen.getByRole('button', { name: 'Cancel', hidden: true })
    );

    expect(onCloseMock).toHaveBeenCalledWith(false);
  });
});
