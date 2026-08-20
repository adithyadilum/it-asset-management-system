import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    fields: [
      { value: 'status', label: 'Status', options: ['Active', 'Inactive'] },
      { value: 'name', label: 'Name' },
    ],
    appliedFilters: [],
    onApplyFilter: vi.fn(),
    onClearFilter: vi.fn(),
    onClearAllFilters: vi.fn(),
  };

  it('renders search input', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    const user = userEvent.setup();
    const onSearchChangeMock = vi.fn();

    render(<FilterBar {...defaultProps} onSearchChange={onSearchChangeMock} />);
    await user.type(screen.getByPlaceholderText('Search...'), 'test');

    expect(onSearchChangeMock).toHaveBeenCalled();
  });

  it('opens filter popover, types a value and applies filter', async () => {
    const user = userEvent.setup();
    const onApplyFilterMock = vi.fn();

    render(
      <FilterBar
        {...defaultProps}
        defaultField="name"
        onApplyFilter={onApplyFilterMock}
      />
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));

    const input = screen.getByPlaceholderText('Enter name');
    await user.type(input, 'Dell');

    const applyBtn = screen.getByRole('button', { name: 'Apply filter' });
    await user.click(applyBtn);

    expect(onApplyFilterMock).toHaveBeenCalledWith({
      field: 'name',
      operator: 'is',
      value: 'Dell',
    });
  });

  it('renders applied filter badges and clears them', async () => {
    const user = userEvent.setup();
    const onClearFilterMock = vi.fn();

    render(
      <FilterBar
        {...defaultProps}
        appliedFilters={[{ field: 'status', operator: 'is', value: 'Active' }]}
        onClearFilter={onClearFilterMock}
      />
    );

    expect(screen.getByText('status is Active')).toBeInTheDocument();

    const clearBtn = screen.getByLabelText('Clear status filter');
    await user.click(clearBtn);

    expect(onClearFilterMock).toHaveBeenCalledWith('status');
  });
});
