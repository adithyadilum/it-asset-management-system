import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReportTemplateCard } from './report-template-card';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
}));

// Mock PointerEvent for Radix UI AlertDialog
if (typeof global.PointerEvent === 'undefined') {
  class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    constructor(type: string, props: any) {
      super(type, props);
      this.button = props?.button || 0;
      this.ctrlKey = props?.ctrlKey || false;
    }
  }
  global.PointerEvent = MockPointerEvent as any;
}
HTMLElement.prototype.hasPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

describe('ReportTemplateCard', () => {
  const mockTemplate: any = {
    id: 1,
    name: 'Test Template',
    description: 'A test template',
    dataSource: 'Assets',
  };

  it('renders correctly', () => {
    render(<ReportTemplateCard template={mockTemplate} />);
    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('A test template')).toBeInTheDocument();
  });

  it('handles preview click', () => {
    const mockOnPreviewClick = vi.fn();
    render(<ReportTemplateCard template={mockTemplate} onPreviewClick={mockOnPreviewClick} />);

    fireEvent.click(screen.getByText(/Preview report/));
    expect(mockOnPreviewClick).toHaveBeenCalledWith(1);
  });

  it('handles dropdown menu actions', async () => {
    const mockOnEditClick = vi.fn();
    const mockOnDeleteClick = vi.fn();

    render(
      <ReportTemplateCard
        template={mockTemplate}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
      />
    );

    const trigger = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Edit report')).toBeInTheDocument();
    expect(screen.getByText('Delete report')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit report'));
    expect(mockOnEditClick).toHaveBeenCalledWith(mockTemplate);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Delete report'));

    // Should open delete dialog
    expect(screen.getByText('Delete Report Template')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDeleteClick).toHaveBeenCalledWith(1);
  });
});
