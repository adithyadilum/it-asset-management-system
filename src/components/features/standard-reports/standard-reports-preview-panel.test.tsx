import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StandardReportsPreviewPanel } from './standard-reports-preview-panel';
import { fetchReportPreview } from '@/actions/standard-reports';

vi.mock('@/actions/standard-reports', () => ({
  fetchReportPreview: vi.fn(),
}));

vi.mock('./generate-report-pdf-modal', () => ({
  GenerateReportPdfModal: ({ isOpen, onOpenChange }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="pdf-modal">
        PDF Modal <button onClick={() => onOpenChange(false)}>Close PDF</button>
      </div>
    );
  },
}));

vi.mock('@/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, onOpenChange, children, footer, title }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="export-modal">
        <h2>{title}</h2>
        {children}
        <div>{footer}</div>
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    );
  },
}));

describe('StandardReportsPreviewPanel', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockPagination = { pageIndex: 0, pageSize: 16 };
  const mockSetPagination = vi.fn();

  const defaultProps = {
    showDataGrid: true,
    previewData: [
      { id: '1', 'Asset Tag': 'AST-001', 'Asset Name': 'MacBook Pro' },
    ],
    isLoading: false,
    selectedFields: ['Asset Tag', 'Asset Name'],
    source: 'Asset Registry',
    filterState: { source: 'Asset Registry' } as any,
    generatedBy: 'Test User',
    pagination: mockPagination,
    setPagination: mockSetPagination,
    pageCount: 1,
  };

  it('renders data grid when showDataGrid is true', () => {
    render(<StandardReportsPreviewPanel {...defaultProps} />);
    expect(screen.getByText('AST-001')).toBeInTheDocument();
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
  });

  it('shows error state when errorMessage is provided', () => {
    render(
      <StandardReportsPreviewPanel
        {...defaultProps}
        errorMessage="Failed to load"
      />
    );
    expect(screen.getByText('Error loading report')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows empty state when showDataGrid is false', () => {
    render(
      <StandardReportsPreviewPanel {...defaultProps} showDataGrid={false} />
    );
    expect(
      screen.getByText(/Select your filters and click Preview Data/i)
    ).toBeInTheDocument();
  });

  it('handles Export CSV flow', async () => {
    (fetchReportPreview as any).mockResolvedValue({ data: [], totalRows: 0 });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();

    render(<StandardReportsPreviewPanel {...defaultProps} />);

    fireEvent.click(screen.getByText(/Export CSV/i));

    expect(screen.getByTestId('export-modal')).toBeInTheDocument();

    // Choose All Records
    fireEvent.click(screen.getByLabelText('All Records'));

    // Click Export
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(fetchReportPreview).toHaveBeenCalled();
    });
  });

  it('opens PDF Modal', () => {
    render(<StandardReportsPreviewPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Generate PDF/i));
    expect(screen.getByTestId('pdf-modal')).toBeInTheDocument();
  });
});
