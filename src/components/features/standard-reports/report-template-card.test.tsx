const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture =
  HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import { ReportTemplateCard } from './report-template-card';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
}));

// Mock PointerEvent for Radix UI AlertDialog
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

describe('ReportTemplateCard', () => {
  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
    HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

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
    render(
      <ReportTemplateCard
        template={mockTemplate}
        onPreviewClick={mockOnPreviewClick}
      />
    );

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

describe('ReportTemplateCard permissions', () => {
  const template = {
    id: 1,
    name: 'Assets by Location',
    description: 'All assets grouped by site',
    dataSource: 'Assets',
  } as never;

  it('offers the edit/delete menu when the viewer may manage templates', () => {
    render(
      <ReportTemplateCard
        template={template}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /open menu/i })
    ).toBeInTheDocument();
  });

  it('hides the menu entirely for a read-only viewer', () => {
    // Both handlers absent means every item in the menu would have failed
    // against the server guard, so the trigger itself is not rendered.
    render(<ReportTemplateCard template={template} />);
    expect(
      screen.queryByRole('button', { name: /open menu/i })
    ).not.toBeInTheDocument();
  });

  it('still shows the template and its preview action when read-only', () => {
    render(<ReportTemplateCard template={template} onPreviewClick={vi.fn()} />);
    expect(screen.getByText('Assets by Location')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /preview report/i })
    ).toBeInTheDocument();
  });
});
