import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TableEmptyState } from './table-empty-state';

describe('TableEmptyState', () => {
  it('renders default text when no props are provided', () => {
    render(<TableEmptyState />);
    expect(screen.getByText('No records yet')).toBeInTheDocument();
    expect(screen.getByText('There is nothing to show in this table yet.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(<TableEmptyState title="Custom Title" description="Custom Description" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });

  it('renders media if provided', () => {
    const CustomMedia = () => <svg data-testid="custom-media" />;
    render(<TableEmptyState media={<CustomMedia />} />);
    expect(screen.getByTestId('custom-media')).toBeInTheDocument();
  });

  it('renders action link when action.href is provided', () => {
    render(
      <TableEmptyState 
        action={{ label: 'Go to Home', href: '/home' }} 
      />
    );
    const link = screen.getByRole('link', { name: 'Go to Home' });
    expect(link).toHaveAttribute('href', '/home');
  });

  it('renders action button and triggers onClick when action.href is omitted', async () => {
    const user = userEvent.setup();
    const onClickMock = vi.fn();
    
    render(
      <TableEmptyState 
        action={{ label: 'Click Me', onClick: onClickMock }} 
      />
    );
    
    const button = screen.getByRole('button', { name: 'Click Me' });
    await user.click(button);
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
