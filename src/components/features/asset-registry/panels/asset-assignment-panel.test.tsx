import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssetAssignmentDetailsPanel } from './asset-assignment-panel';

vi.mock('@/components/features/asset-registry/tags/tag-pdf-document', () => ({
  TagPDFDocument: () => <div>TagPDFDocument</div>,
}));

vi.mock('@/actions/maintenance', () => ({
  getAssetMaintenanceHistory: vi.fn().mockResolvedValue({ success: true, history: [] }),
}));

describe('AssetAssignmentPanel', () => {
  it('renders assignment panel', () => {
    // @ts-ignore
    render(<AssetAssignmentDetailsPanel assetId="1" assetTag="AST-1" category="Laptops" brand="Apple" model="MacBook Pro" serialNumber="SN123" owner="IT" assignedTo="Unassigned" group="Hardware" dateCreated="2023-01-01" assetName="MacBook Pro" />);
    expect(screen.getAllByText(/MacBook Pro/i).length).toBeGreaterThan(0);
  });
});
