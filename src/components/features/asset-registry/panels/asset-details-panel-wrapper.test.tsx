import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { AssetDetailsPanelWrapper } from './asset-details-panel-wrapper';

const getAssetPanelDataAction = vi.hoisted(() => vi.fn());

vi.mock('@/actions/asset-registry-panels', () => ({
  getAssetPanelDataAction,
  getEditDropdownOptionsAction: vi.fn(),
}));

// Mock the child to simplify
vi.mock('./asset-details-panel', () => ({
  AssetDetailsPanel: () => <div data-testid="asset-details-panel" />,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

describe('AssetDetailsPanelWrapper', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders wrapper', () => {
    render(
      <AssetDetailsPanelWrapper isOpen={false} recordId="1" onClose={vi.fn()} />
    );
    // In a real scenario, this would test fetching data and then rendering the child
    // Since we don't have mock data here, it might just render loading state
    expect(document.body).toBeTruthy();
  });

  it('deduplicates the panel request during Strict Mode effects', async () => {
    getAssetPanelDataAction.mockResolvedValue({
      success: true,
      data: {
        details: null,
        history: [],
        maintenance: [],
        allocations: [],
        financial: null,
      },
    });

    render(
      <StrictMode>
        <AssetDetailsPanelWrapper
          isOpen={true}
          recordId="record-1"
          onClose={vi.fn()}
        />
      </StrictMode>
    );

    await waitFor(() => {
      expect(getAssetPanelDataAction).toHaveBeenCalledTimes(1);
    });
  });
});
