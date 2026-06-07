import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MasterDataCreatePanel } from './master-data-create-panel';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock the slide panel since it uses ResizeObserver and might be complex
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

describe('MasterDataCreatePanel', () => {
  const defaultProps = {
    isOpen: true,
    onCloseUrl: '/settings/master-data',
    entity: 'asset-categories',
    categories: [],
    locations: [],
    brands: [],
    deviceModels: [],
    vendors: [],
    owners: [],
    departments: [],
    customStatuses: [],
  };

  it('renders correctly when open', () => {
    render(<MasterDataCreatePanel {...defaultProps} />);
    expect(screen.getByTestId('slide-panel')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText(/Add New Category/i)).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<MasterDataCreatePanel {...defaultProps} isOpen={false} />);
    expect(screen.getByTestId('slide-panel')).toHaveAttribute('data-open', 'false');
    expect(screen.queryByText(/Add New Category/i)).not.toBeInTheDocument();
  });
});
