import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GenerateReportPdfModal } from './generate-report-pdf-modal';
import { generateAndOpenReportPdf } from '@/lib/utils/report-print';
import { fetchReportPreview } from '@/actions/standard-reports';

vi.mock('@/lib/utils/report-print', () => ({
  generateAndOpenReportPdf: vi.fn(),
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

vi.mock('@/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, onOpenChange, children, footer, title }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="pdf-modal">
        <h2>{title}</h2>
        {children}
        <div>{footer}</div>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    );
  },
}));

describe('GenerateReportPdfModal', () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    previewData: [{ id: '1', name: 'Test' }],
    headers: ['name'],
    filterState: { source: 'Assets', assetType: '', category: '', location: '', status: '', masterDataType: '' } as any,
    source: 'Assets',
    generatedBy: 'User A',
  };

  it('renders and allows generating preview PDF', async () => {
    render(<GenerateReportPdfModal {...defaultProps} />);
    
    expect(screen.getByText('Generate PDF Report')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    
    await waitFor(() => {
      expect(generateAndOpenReportPdf).toHaveBeenCalled();
    });
  });

  it('handles generating all records and large export warning', async () => {
    (fetchReportPreview as any).mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], totalRows: 6000 });
    
    render(<GenerateReportPdfModal {...defaultProps} />);
    
    fireEvent.click(screen.getByText('All Matching Records'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    
    await waitFor(() => {
      expect(screen.getByText(/Large export warning/i)).toBeInTheDocument();
    });
    
    // Proceed anyway
    fireEvent.click(screen.getByRole('button', { name: 'Proceed Anyway' }));
    
    await waitFor(() => {
      expect(generateAndOpenReportPdf).toHaveBeenCalled();
    });
  });
});
