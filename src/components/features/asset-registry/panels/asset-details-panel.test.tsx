import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AssetDetailsPanel } from './asset-details-panel';

vi.mock('@/components/features/asset-registry/tags/tag-pdf-document', () => ({
  TagPDFDocument: () => <div>TagPDFDocument</div>,
}));

vi.mock('@/actions/maintenance', () => ({
  getAssetMaintenanceHistory: vi
    .fn()
    .mockResolvedValue({ success: true, history: [] }),
}));

describe('AssetDetailsPanel', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders asset details', () => {
    // @ts-ignore
    render(
      <AssetDetailsPanel
        isOpen={true}
        onClose={vi.fn()}
        assetId="1"
        assetTag="AST-1"
        assetCategory="Laptops"
        brand="Apple"
        model="MacBook Pro"
        serialNumber="SN123"
        location="IT"
        dateCreated="2023-01-01"
        updatedAt="2023-01-01"
        status="Active"
      />
    );
    expect(screen.getAllByText('AST-1').length).toBeGreaterThan(0);
  });
});
