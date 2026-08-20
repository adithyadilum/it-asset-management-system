import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SlidePanel } from './slide-panel';

describe('SlidePanel', () => {
  const defaultProps = {
    isOpen: true,
    disableTransition: true, // disabled for easier sync testing
    onClose: vi.fn(),
    title: 'Panel Title',
    content: <div>Panel Content</div>,
  };

  it('renders content when open', () => {
    render(<SlidePanel {...defaultProps} />);
    expect(screen.getByText('Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SlidePanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Panel Title')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    render(<SlidePanel {...defaultProps} onClose={onCloseMock} />);

    await user.click(screen.getByRole('button', { name: /close panel/i }));
    expect(onCloseMock).toHaveBeenCalledWith(false);
  });

  it('renders actions and calls onClick', async () => {
    const user = userEvent.setup();
    const actionMock = vi.fn();

    render(
      <SlidePanel
        {...defaultProps}
        actions={[{ label: 'Save', onClick: actionMock }]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(actionMock).toHaveBeenCalled();
  });
});
