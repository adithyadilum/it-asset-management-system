import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MasterDataRecordPanel } from './master-data-record-panel';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('@/components/shared/slide-panel', () => ({
  SlidePanel: (props: any) => (
    <div data-testid="slide-panel" data-open={props.isOpen}>
      {props.isOpen && (
        <>
          {props.title && <h2>{props.title}</h2>}
          {props.children}
          {props.content}
        </>
      )}
    </div>
  )
}));

// Mock ResizeObserver
class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = ResizeObserver;

describe('MasterDataRecordPanel', () => {
  const defaultProps = {
    isOpen: true,
    onCloseUrl: '/settings/master-data',
    entity: 'asset-categories',
    recordId: '1',
    initialMode: 'view' as any,
    categories: [{ id: 1, name: 'Test Category', code: 'TC', description: 'Desc', customSchema: { modelSpecs: [], assetTracking: [] } } as any],
    locations: [],
    brands: [],
    deviceModels: [],
    vendors: [],
    owners: [],
    departments: [],
    customStatuses: [],
  };

  it('renders correctly when open', () => {
    render(<MasterDataRecordPanel {...defaultProps} />);
    expect(screen.getByTestId('slide-panel')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText(/Category: Test Category/i)).toBeInTheDocument();
  });

  it('shows not found state if record does not exist', () => {
    render(<MasterDataRecordPanel {...defaultProps} recordId="non-existent" />);
    expect(screen.getByText('The selected record could not be found.')).toBeInTheDocument();
  });
});
