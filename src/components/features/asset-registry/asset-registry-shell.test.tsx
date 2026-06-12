import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetRegistryShell } from './asset-registry-shell';
import { getAssetsByPillar, getCategoriesByPillar, getAllAssetsUnified } from '@/actions/asset-registry';
import { getManualOverrideStatuses } from '@/actions/statuses';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';

// Mock actions
vi.mock('@/actions/asset-registry', () => ({
  getAssetsByPillar: vi.fn(),
  getCategoriesByPillar: vi.fn(),
  getAllAssetsUnified: vi.fn(),
}));

vi.mock('@/actions/statuses', () => ({
  getManualOverrideStatuses: vi.fn(),
}));

vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  canManageAssets: vi.fn(),
}));

vi.mock('./asset-registry-content', () => ({
  AssetRegistryContent: (props: any) => <div data-testid="content">Content: {props.config.view} - canManage: {String(props.canManage)}</div>
}));

describe('AssetRegistryShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCategoriesByPillar as any).mockResolvedValue([]);
    (getAssetsByPillar as any).mockResolvedValue({ data: [], meta: {} });
    (getAllAssetsUnified as any).mockResolvedValue({ data: [], meta: {} });
    (getManualOverrideStatuses as any).mockResolvedValue([]);
    (getAuthenticatedUser as any).mockResolvedValue({ role: 'GlobalAdmin' });
    (canManageAssets as any).mockReturnValue(true);
  });

  it('fetches unified assets when view is unified', async () => {
    const Component = await AssetRegistryShell({ view: 'unified' });
    render(Component as React.ReactElement);

    expect(getAllAssetsUnified).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    expect(screen.getByTestId('content')).toHaveTextContent('Content: unified - canManage: true');
  });

  it('fetches assets by pillar when view is hardware', async () => {
    const Component = await AssetRegistryShell({ view: 'hardware' });
    render(Component as React.ReactElement);

    expect(getAssetsByPillar).toHaveBeenCalledWith(expect.objectContaining({ pillar: 'Hardware' }));
    expect(screen.getByTestId('content')).toHaveTextContent('Content: hardware - canManage: true');
  });

  it('parses searchParams correctly', async () => {
    const Component = await AssetRegistryShell({ 
      view: 'unified', 
      searchParams: Promise.resolve({ panel: 'details', id: '123' }) 
    });
    render(Component as React.ReactElement);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
