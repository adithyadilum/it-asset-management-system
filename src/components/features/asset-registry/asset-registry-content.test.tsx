import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AssetRegistryContent } from './asset-registry-content';

vi.mock('./asset-registry-client', () => ({
  AssetRegistryClient: (props: any) => <div data-testid="client">Client: {props.currentPanel}</div>
}));

vi.mock('./asset-registry-panels', () => ({
  AssetRegistryPanels: (props: any) => <div data-testid="panels">Panels: {props.currentPanel}</div>
}));

describe('AssetRegistryContent', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockConfig = { view: 'unified', pillar: '', defaultPageSize: 50 } as any;

  it('renders Client and Panels with provided props', () => {
    render(
      <AssetRegistryContent
        config={mockConfig}
        initialCategories={[]}
        initialResult={{ data: [], meta: { total: 0, page: 1, pageSize: 50, totalPages: 1 } }}
        currentPanel="add-asset"
        recordId="123"
        closePanelUrl="/assets"
        pillar=""
        manualStatuses={[]}
        canManage={true}
      />
    );

    expect(screen.getByTestId('client')).toHaveTextContent('Client: add-asset');
    expect(screen.getByTestId('panels')).toHaveTextContent('Panels: add-asset');
  });
});
