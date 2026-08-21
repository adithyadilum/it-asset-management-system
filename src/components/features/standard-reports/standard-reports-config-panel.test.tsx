import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StandardReportsConfigPanel } from './standard-reports-config-panel';

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select-mock" data-value={value}>
      {children}
      <button onClick={() => onValueChange('Assets')}>
        Select Source Assets
      </button>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./report-template-card', () => ({
  ReportTemplateCard: ({ template, onPreviewClick }: any) => (
    <div data-testid="template-card">
      {template.name}
      <button onClick={() => onPreviewClick(template.id)}>
        Preview Template
      </button>
    </div>
  ),
}));

describe('StandardReportsConfigPanel', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockFilterOptions: any = {
    categories: [],
    locations: [],
    statuses: [],
    assignmentStates: [],
    returnConditions: [],
    maintenanceStatuses: [],
    disposalStatuses: [],
    licenseTypes: [],
    auditActionTypes: [],
    vendors: [],
    masterDataTypes: [],
    assetTypes: [],
  };

  const mockTemplates = [{ id: 1, name: 'Template 1', dataSource: 'Assets' }];

  it('renders templates and configuration options', () => {
    const mockOnFilterChange = vi.fn();
    const mockOnManualPreview = vi.fn();

    render(
      <StandardReportsConfigPanel
        filterState={{
          source: 'Assets',
          assetType: '',
          category: '',
          location: '',
          status: '',
          masterDataType: '',
        }}
        filterOptions={mockFilterOptions}
        templates={mockTemplates as any}
        onFilterChange={mockOnFilterChange}
        onTemplatePreview={vi.fn()}
        onTemplateDelete={vi.fn()}
        onManualPreview={mockOnManualPreview}
        onClearFilters={vi.fn()}
        onTemplateCreated={vi.fn()}
        isLoading={false}
        resetKey={0}
      />
    );

    expect(screen.getByText('Template 1')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Select Source Assets')[0]);
    expect(mockOnFilterChange).toHaveBeenCalledWith('source', 'Assets');

    fireEvent.click(screen.getByText('Preview report'));
    expect(mockOnManualPreview).toHaveBeenCalled();
  });
});
