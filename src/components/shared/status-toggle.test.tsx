import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StatusToggle } from './status-toggle';

describe('StatusToggle', () => {
  it('renders active state with default text', () => {
    render(<StatusToggle isActive={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders inactive state with default text', () => {
    render(<StatusToggle isActive={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('switch')).not.toBeChecked();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders custom text for active/inactive states', () => {
    const { rerender } = render(
      <StatusToggle isActive={true} onToggle={vi.fn()} activeText="On" inactiveText="Off" />
    );
    expect(screen.getByText('On')).toBeInTheDocument();

    rerender(
      <StatusToggle isActive={false} onToggle={vi.fn()} activeText="On" inactiveText="Off" />
    );
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggleMock = vi.fn();
    
    render(<StatusToggle isActive={false} onToggle={onToggleMock} />);
    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(onToggleMock).toHaveBeenCalledWith(true);
  });

  it('respects the disabled prop', async () => {
    const user = userEvent.setup();
    const onToggleMock = vi.fn();
    
    render(<StatusToggle isActive={false} onToggle={onToggleMock} disabled={true} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    
    await user.click(toggle);
    expect(onToggleMock).not.toHaveBeenCalled();
  });
});
