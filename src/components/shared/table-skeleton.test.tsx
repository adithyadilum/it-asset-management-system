import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TableSkeleton } from './table-skeleton';

describe('TableSkeleton', () => {
  it('renders the correct number of rows and columns', () => {
    const { container } = render(
      <TableSkeleton rowCount={3} columnWidths={['w-[20%]', 'w-[50%]']} />
    );
    
    // 1 Header row + 3 Data rows = 4 rows
    // Each row has 1 checkbox (by default) + 2 columns = 3 items per row
    // 4 rows * 3 items = 12 skeletons
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(12);
  });

  it('omits checkbox skeletons if showCheckbox is false', () => {
    const { container } = render(
      <TableSkeleton rowCount={2} columnWidths={['w-[100%]']} showCheckbox={false} />
    );
    
    // 1 Header row + 2 Data rows = 3 rows
    // Each row has 0 checkboxes + 1 column = 1 item per row
    // 3 rows * 1 item = 3 skeletons
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });
});
