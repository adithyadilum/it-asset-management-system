import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MasterDataPanels } from './master-data-panels';

vi.mock('@/components/features/master-data/master-data-create-panel', () => ({
  MasterDataCreatePanel: (props: any) => (
    <div
      data-testid="create-panel"
      data-open={props.isOpen}
      data-entity={props.entity}
    >
      Create Panel
    </div>
  ),
}));

vi.mock('@/components/features/master-data/master-data-record-panel', () => ({
  MasterDataRecordPanel: (props: any) => (
    <div
      data-testid="record-panel"
      data-open={props.isOpen}
      data-entity={props.entity}
      data-id={props.recordId}
    >
      Record Panel
    </div>
  ),
}));

describe('MasterDataPanels', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const defaultProps = {
    closePanelUrl: '/settings/master-data',
    categories: [],
    locations: [],
    brands: [],
    deviceModels: [],
    vendors: [],
    owners: [],
    departments: [],
    customStatuses: [],
  };

  it('renders create panel when currentPanel is create', () => {
    render(
      <MasterDataPanels
        {...defaultProps}
        currentPanel="create"
        entity="brands"
      />
    );

    const createPanel = screen.getByTestId('create-panel');
    expect(createPanel).toHaveAttribute('data-open', 'true');
    expect(createPanel).toHaveAttribute('data-entity', 'brands');

    const recordPanel = screen.getByTestId('record-panel');
    expect(recordPanel).toHaveAttribute('data-open', 'false');
  });

  it('renders record panel when currentPanel is record', () => {
    render(
      <MasterDataPanels
        {...defaultProps}
        currentPanel="record"
        entity="brands"
        recordId="123"
      />
    );

    const createPanel = screen.getByTestId('create-panel');
    expect(createPanel).toHaveAttribute('data-open', 'false');

    const recordPanel = screen.getByTestId('record-panel');
    expect(recordPanel).toHaveAttribute('data-open', 'true');
    expect(recordPanel).toHaveAttribute('data-entity', 'brands');
    expect(recordPanel).toHaveAttribute('data-id', '123');
  });

  it('renders both as closed when currentPanel is undefined', () => {
    render(<MasterDataPanels {...defaultProps} />);

    expect(screen.getByTestId('create-panel')).toHaveAttribute(
      'data-open',
      'false'
    );
    expect(screen.getByTestId('record-panel')).toHaveAttribute(
      'data-open',
      'false'
    );
  });
});
