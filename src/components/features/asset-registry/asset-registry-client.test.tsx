import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { AssetRegistryClient } from './asset-registry-client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getAllAssetsUnified } from '@/actions/asset-registry';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock the actions
vi.mock('@/actions/asset-registry', () => ({
  getAssetsByPillar: vi
    .fn()
    .mockResolvedValue({ data: [], meta: { totalPages: 1 } }),
  getAllAssetsUnified: vi
    .fn()
    .mockResolvedValue({ data: [], meta: { totalPages: 1 } }),
}));

vi.mock('@/actions/statuses', () => ({
  getCustomStatuses: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/features/bulk-import/bulk-import-wizard', () => ({
  BulkImportWizard: () => <div data-testid="bulk-import-wizard" />,
}));

vi.mock(
  '@/components/features/asset-registry/tags/print-configuration-modal',
  () => ({
    PrintConfigurationModal: () => (
      <div data-testid="print-configuration-modal" />
    ),
  })
);

vi.mock(
  '@/components/features/disposals/dispose-assets-request-dialog',
  () => ({
    DisposeAssetsRequestDialog: () => (
      <div data-testid="dispose-assets-request-dialog" />
    ),
  })
);

vi.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: any) => fn,
}));

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

describe('AssetRegistryClient', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockConfig = {
    view: 'unified',
    title: 'All Assets',
    defaultCategoryLabel: 'All Assets',
    defaultPageSize: 50,
    filters: [],
    filterFieldOptions: [],
  } as any;
  const mockInitialResult = {
    data: [
      {
        id: '1',
        assetTag: 'TAG-1',
        name: 'Laptop',
        status: 'ACTIVE',
        category: 'Computers',
        pillar: 'HARDWARE',
      },
    ],
    meta: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
  } as any;

  const mockRouter = { push: vi.fn(), replace: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (usePathname as any).mockReturnValue('/assets');
    (useSearchParams as any).mockReturnValue(new URLSearchParams());
  });

  it('renders the title and asset count', () => {
    render(
      <AssetRegistryClient
        config={mockConfig}
        initialCategories={[]}
        initialResult={mockInitialResult}
      />
    );
    expect(screen.getByText('All Assets')).toBeInTheDocument();
  });

  it('renders the asset in the table', () => {
    render(
      <AssetRegistryClient
        config={mockConfig}
        initialCategories={[]}
        initialResult={mockInitialResult}
      />
    );
    expect(screen.getByText('TAG-1')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
  });

  it('reuses the server result instead of refetching on mount', async () => {
    render(
      <AssetRegistryClient
        config={mockConfig}
        initialCategories={[]}
        initialResult={mockInitialResult}
      />
    );

    await waitFor(() => {
      expect(getAllAssetsUnified).not.toHaveBeenCalled();
    });
  });

  it('opens record panels with the asset UUID', () => {
    render(
      <AssetRegistryClient
        config={mockConfig}
        initialCategories={[]}
        initialResult={mockInitialResult}
      />
    );

    fireEvent.click(screen.getByText('TAG-1'));

    expect(mockRouter.push).toHaveBeenCalledWith(
      '/assets?panel=record&id=1&animate=1',
      { scroll: false }
    );
  });

  it('handles search input', async () => {
    render(
      <AssetRegistryClient
        config={mockConfig}
        initialCategories={[]}
        initialResult={mockInitialResult}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(getAllAssetsUnified).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test' })
      );
    });
  });
});
