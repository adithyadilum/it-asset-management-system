import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DisposalAssetDetailPanel } from './disposal-asset-detail-panel';

vi.mock('@/components/features/asset-registry/panels/asset-details-panel-wrapper', () => ({
  AssetDetailsPanelWrapper: ({ isOpen, additionalTabs }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="asset-details-panel">
        <div data-testid="tabs">
          {additionalTabs?.map((tab: any) => (
            <div key={tab.id}>
              <h3>{tab.label}</h3>
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    );
  },
}));

describe('DisposalAssetDetailPanel', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockDisposalDetails: any = {
    status: 'Completed',
    disposalDate: '2023-01-01',
    flaggedBy: 'John Doe',
    disposedBy: 'Jane Smith',
    reason: 'End of life',
    documentUrls: ['http://example.com/doc1.pdf'],
  };

  it('renders correctly with disposal details', () => {
    render(
      <DisposalAssetDetailPanel
        isOpen={true}
        onClose={vi.fn()}
        assetId="1"
        disposalDetails={mockDisposalDetails}
      />
    );

    expect(screen.getByTestId('asset-details-panel')).toBeInTheDocument();
    expect(screen.getByText('Disposal')).toBeInTheDocument();
    
    // Status
    expect(screen.getByText('Disposed')).toBeInTheDocument();
    // Dates & Users
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    // Reason
    expect(screen.getByText(/"End of life"/)).toBeInTheDocument();
    // Documents
    expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
  });

  it('renders correctly without disposal details', () => {
    render(
      <DisposalAssetDetailPanel
        isOpen={true}
        onClose={vi.fn()}
        assetId="1"
      />
    );

    expect(screen.getByTestId('asset-details-panel')).toBeInTheDocument();
    // additionalTabs should be empty
    expect(screen.queryByText('Disposal')).not.toBeInTheDocument();
  });
});
