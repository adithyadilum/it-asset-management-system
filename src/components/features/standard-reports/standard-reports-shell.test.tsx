import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StandardReportsShell } from './standard-reports-shell';
import { fetchReportPreview } from '@/actions/standard-reports';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/actions/standard-reports', () => ({
  fetchReportPreview: vi.fn(),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./standard-reports-config-panel', () => ({
  StandardReportsConfigPanel: ({ onManualPreview, onFilterChange }: any) => (
    <div data-testid="config-panel">
      <button onClick={onManualPreview}>Preview</button>
      <button onClick={() => onFilterChange('source', 'Assets')}>
        Change Source
      </button>
    </div>
  ),
}));

vi.mock('./standard-reports-preview-panel', () => ({
  StandardReportsPreviewPanel: ({ showDataGrid, previewData }: any) => {
    if (!showDataGrid) return <div data-testid="preview-panel-hidden" />;
    return (
      <div data-testid="preview-panel">
        <div>{previewData.length} records</div>
      </div>
    );
  },
}));

describe('StandardReportsShell', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly and handles interactions', async () => {
    (fetchReportPreview as any).mockResolvedValue({
      data: [{ id: 1, tag: 'T-1' }],
      pageCount: 1,
    });

    render(
      <StandardReportsShell
        filterOptions={
          {
            assetTypes: [],
            categories: [],
            locations: [],
            statuses: [],
            masterDataTypes: [],
            vendors: [],
            manufacturers: [],
            roleTypes: [],
            permissionModules: [],
            dateRanges: [],
          } as any
        }
        templates={[]}
        generatedBy="User A"
      />
    );

    expect(screen.getByTestId('config-panel')).toBeInTheDocument();
    expect(screen.getByTestId('preview-panel-hidden')).toBeInTheDocument();

    // Click Preview
    fireEvent.click(screen.getByText('Preview'));

    await waitFor(() => {
      expect(fetchReportPreview).toHaveBeenCalled();
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
      expect(screen.getByText('1 records')).toBeInTheDocument();
    });

    // Click Change Source
    fireEvent.click(screen.getByText('Change Source'));

    await waitFor(() => {
      // It should fetch again when filter state changes and preview is active
      expect(fetchReportPreview).toHaveBeenCalledTimes(2);
    });
  });
});
