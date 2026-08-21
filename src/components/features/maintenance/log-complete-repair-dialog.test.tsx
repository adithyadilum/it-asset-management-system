const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture =
  HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogCompleteRepairDialog } from './log-complete-repair-dialog';

HTMLElement.prototype.scrollIntoView = vi.fn();

describe('LogCompleteRepairDialog', () => {
  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
    HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
  });

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (props = {}) => {
    return render(
      <LogCompleteRepairDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        {...props}
      />
    );
  };

  it('renders correctly', () => {
    renderDialog();
    expect(screen.getByText('Log Completed Repair')).toBeInTheDocument();
    expect(screen.getByText(/Actual Final Cost/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolution Notes/i)).toBeInTheDocument();
  });

  it('disables submit button if required fields are empty', () => {
    renderDialog();
    const submitBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(submitBtn).toBeDisabled();
  });

  it('submits correctly when valid data is entered', async () => {
    renderDialog();

    // Actual cost
    const costInput = screen.getByPlaceholderText('10.00');
    fireEvent.change(costInput, { target: { value: '250.00' } });

    // Notes
    const notesInput = screen.getByPlaceholderText(
      /e.g., "Replaced display cable"/i
    );
    fireEvent.change(notesInput, { target: { value: 'Replaced motherboard' } });

    // The status select has default value 'Available', so button should be enabled
    const submitBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        actualCost: '250.00',
        resolutionNotes: 'Replaced motherboard',
        updateStatusTo: 'Available',
      });
    });
  });

  it('allows changing status to Disposed', async () => {
    renderDialog();

    const costInput = screen.getByPlaceholderText('10.00');
    fireEvent.change(costInput, { target: { value: '250.00' } });

    const notesInput = screen.getByPlaceholderText(
      /e.g., "Replaced display cable"/i
    );
    fireEvent.change(notesInput, { target: { value: 'Replaced motherboard' } });

    // Change status using Shadcn Select
    // Since Shadcn Select uses role="combobox" and role="option", we do:
    // Assuming it's the only one or we find by something else
    // Wait, there are two Selects: Currency and Status!
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[1]; // second one is status

    fireEvent.click(statusSelect);
    const disposedOption = await screen.findByRole('option', {
      name: 'Disposed',
    });
    fireEvent.click(disposedOption);

    const submitBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        actualCost: '250.00',
        resolutionNotes: 'Replaced motherboard',
        updateStatusTo: 'Disposed',
      });
    });
  });
});
