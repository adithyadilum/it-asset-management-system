import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from './data-table';

describe('DataTable', () => {
  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
  ];

  const data = [
    { id: '1', name: 'Item 1', status: 'Active' },
    { id: '2', name: 'Item 2', status: 'Inactive' },
  ];

  it('renders table headers and rows', () => {
    render(
      <DataTable columns={columns} data={data} enableRowSelection={false} />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        enableRowSelection={false}
        emptyState={{ title: 'No Data', description: 'Empty table' }}
      />
    );

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('Empty table')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClickMock = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={data}
        enableRowSelection={false}
        onRowClick={onRowClickMock}
      />
    );

    await user.click(screen.getByText('Item 1'));
    expect(onRowClickMock).toHaveBeenCalledWith(data[0], 0);
  });

  it('handles row selection via checkboxes', async () => {
    const user = userEvent.setup();

    render(
      <DataTable columns={columns} data={data} enableRowSelection={true} />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Index 0: Select All Header, Index 1: Row 1, Index 2: Row 2
    expect(checkboxes).toHaveLength(3);

    // Select row 1
    await user.click(checkboxes[1]);

    // Header should change to indicate selection
    expect(screen.getByText('1 row(s) selected')).toBeInTheDocument();
  });

  it('hides footer when hideFooter is true', () => {
    render(<DataTable columns={columns} data={data} hideFooter={true} />);
    expect(screen.queryByText('Rows per page')).not.toBeInTheDocument();
  });

  it('preserves selected rows across filtered data changes (search)', async () => {
    const user = userEvent.setup();
    const onActionClick = vi.fn();

    const { rerender } = render(
      <DataTable
        columns={columns}
        data={data}
        enableRowSelection={true}
        selectionActions={[
          {
            id: 'bulk-act',
            label: 'Run Bulk',
            onClick: onActionClick,
          },
        ]}
      />
    );

    // Select Item 1
    const initialCheckboxes = screen.getAllByRole('checkbox');
    await user.click(initialCheckboxes[1]);
    expect(screen.getByText('1 row(s) selected')).toBeInTheDocument();

    // Simulate search filtering out Item 1 and showing only Item 2
    rerender(
      <DataTable
        columns={columns}
        data={[data[1]]}
        enableRowSelection={true}
        selectionActions={[
          {
            id: 'bulk-act',
            label: 'Run Bulk',
            onClick: onActionClick,
          },
        ]}
      />
    );

    // Selection count should still be 1 even though Item 1 is filtered out
    expect(screen.getByText('1 row(s) selected')).toBeInTheDocument();

    // Select Item 2 in the filtered results
    const filteredCheckboxes = screen.getAllByRole('checkbox');
    await user.click(filteredCheckboxes[1]);
    expect(screen.getByText('2 row(s) selected')).toBeInTheDocument();

    // Clicking the bulk action passes both Item 1 and Item 2
    await user.click(screen.getByRole('button', { name: 'Run Bulk' }));
    expect(onActionClick).toHaveBeenCalledWith([data[0], data[1]]);
  });
});
