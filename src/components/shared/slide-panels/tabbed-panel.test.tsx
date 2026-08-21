import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TabbedPanel } from './tabbed-panel';

describe('TabbedPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Tabbed View',
    tabs: [
      { id: 'tab1', label: 'First Tab', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Second Tab', content: <div>Content 2</div> },
    ],
  };

  it('renders tabs and defaults to the first one', () => {
    render(<TabbedPanel {...defaultProps} />);
    expect(screen.getByText('Tabbed View')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'First Tab', hidden: true })
    ).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    const onTabChangeMock = vi.fn();

    render(<TabbedPanel {...defaultProps} onTabChange={onTabChangeMock} />);
    await user.click(
      screen.getByRole('tab', { name: 'Second Tab', hidden: true })
    );

    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(onTabChangeMock).toHaveBeenCalledWith('tab2');
  });

  it('renders empty state when no tabs are provided', () => {
    render(<TabbedPanel {...defaultProps} tabs={[]} />);
    expect(screen.getByText('No tabs were provided.')).toBeInTheDocument();
  });

  it('respects defaultTabId prop', () => {
    render(<TabbedPanel {...defaultProps} defaultTabId="tab2" />);
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });
});
