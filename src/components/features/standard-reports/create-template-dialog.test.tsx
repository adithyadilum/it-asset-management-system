
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CreateTemplateDialog } from './create-template-dialog';
import { createReportTemplate } from '@/actions/report-templates';

vi.mock('@/actions/report-templates', () => ({
  createReportTemplate: vi.fn(),
  updateReportTemplate: vi.fn(),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select-mock" data-value={value}>
      {children}
      <button onClick={() => onValueChange('Assets')}>Select Assets</button>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

HTMLElement.prototype.scrollIntoView = vi.fn();
if (typeof global.PointerEvent == 'undefined') {
  class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    constructor(type: string, props: any) {
      super(type, props);
      this.button = props?.button || 0;
      this.ctrlKey = props?.ctrlKey || false;
    }
  }
  vi.stubGlobal('PointerEvent', MockPointerEvent as any);
}
HTMLElement.prototype.hasPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

describe('CreateTemplateDialog', () => {
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });
  const mockOnOpenChange = vi.fn();
  const mockOnCreated = vi.fn();
  const mockFilterOptions: any = {
    categories: [{ name: 'Laptops', pillar: 'Hardware' }],
    locations: ['New York'],
    statuses: ['Active'],
    assignmentStates: [],
    returnConditions: [],
    maintenanceStatuses: [],
    disposalStatuses: [],
    licenseTypes: [],
    auditActionTypes: [],
    vendors: [],
    masterDataTypes: [],
    assetTypes: ['Hardware', 'Software'],
  };

  it('renders and allows creating a template', async () => {
    (createReportTemplate as any).mockResolvedValue({ success: true, message: 'Created' });

    render(
      <CreateTemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
        filterOptions={mockFilterOptions}
      />
    );

    expect(screen.getByText('Add New Template')).toBeInTheDocument();

    // Select source first to trigger render of checkboxes
    fireEvent.click(screen.getByText('Select Assets'));

    const checkboxes = await screen.findAllByRole('checkbox');
    // We don't click it because it's already checked by default when source is selected!
    expect(checkboxes.length).toBeGreaterThan(0);

    // Now fill the name and IMMEDIATELY click submit
    const nameInput = screen.getByLabelText(/Report Name/);
    fireEvent.input(nameInput, { target: { value: 'My Report' } });
    fireEvent.change(nameInput, { target: { value: 'My Report' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));

    await waitFor(() => {
      expect(createReportTemplate).toHaveBeenCalled();
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });
});
