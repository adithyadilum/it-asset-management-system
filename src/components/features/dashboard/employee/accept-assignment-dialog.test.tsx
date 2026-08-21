import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AcceptAssignmentDialog } from './accept-assignment-dialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-testid="mock-dialog" onClick={() => onOpenChange?.(false)}>
      {open && children}
    </div>
  ),
  DialogTrigger: ({ children }: any) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  ),
}));

describe('AcceptAssignmentDialog', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders and calls onConfirm when accepted', async () => {
    const mockOnConfirm = vi.fn();

    render(
      <CurrencyProvider initialCurrency="USD">
        <AcceptAssignmentDialog
          assetName="MacBook Pro"
          assetTag="AST-1"
          condition="New"
          assignedBy="Admin"
          date="2023-01-01"
          onConfirm={mockOnConfirm}
          onReportIssue={vi.fn()}
          isOpen={true}
          onOpenChange={vi.fn()}
        />
      </CurrencyProvider>
    );

    expect(
      screen.getByRole('button', { name: /Confirm Receipt/i })
    ).toBeInTheDocument();

    // Check if asset name and tag are displayed
    expect(screen.getByText(/MacBook Pro/i)).toBeInTheDocument();

    // Must check the checkbox first to enable the button
    const user = userEvent.setup();
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Receipt/i });
    await user.click(confirmBtn);
    expect(mockOnConfirm).toHaveBeenCalled();
  });
});
