import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MasterDataManagementClient } from './master-data-management-client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock ResizeObserver
class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', ResizeObserver);

describe('MasterDataManagementClient', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockRouter = { push: vi.fn(), replace: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (usePathname as any).mockReturnValue('/settings/master-data');
    (useSearchParams as any).mockReturnValue(new URLSearchParams());
  });

  const defaultProps = {
    categories: [{ id: 1, _originalId: 'cat-1', name: 'Category 1', code: 'C1', description: 'Desc', createdAt: new Date() } as any],
    locations: [],
    brands: [],
    deviceModels: [],
    vendors: [],
    owners: [],
    departments: [],
    customStatuses: [],
  };

  it('renders the master data table and tabs', () => {
    render(<MasterDataManagementClient {...defaultProps} />);
    
    // Check if the title is there
    expect(screen.getByText('Master Data Management')).toBeInTheDocument();
    
    // Check if the tabs exist
    expect(screen.getByRole('tab', { name: /Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Locations/i })).toBeInTheDocument();
    
    // It should render categories by default since it's the first tab (if not from URL)
    expect(screen.getByText('Category 1')).toBeInTheDocument();
  }, 15000);
});
