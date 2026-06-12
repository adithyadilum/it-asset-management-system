
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
const originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture;

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitiateRepairDialog } from './initiate-repair-dialog';

HTMLElement.prototype.scrollIntoView = vi.fn();

describe('InitiateRepairDialog', () => {
  afterAll(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
    HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
  });

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  
  const mockVendors = [
    { id: 1, companyName: 'Vendor A' },
    { id: 2, companyName: 'Vendor B' },
  ];

  const renderDialog = (props = {}) => {
    return render(
      <InitiateRepairDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        vendors={mockVendors}
        assetId="TAG-123"
        assetName="Test Laptop"
        assetSerial="SN-123"
        reportedBy="John Doe"
        reportedDate={new Date('2023-01-01')}
        {...props}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with asset details', () => {
    renderDialog();
    expect(screen.getByText('Send Asset for Repair')).toBeInTheDocument();
    expect(screen.getByText('Test Laptop')).toBeInTheDocument();
    expect(screen.getByText('TAG-123')).toBeInTheDocument();
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    renderDialog();
    
    // Initial state: submit button should be disabled because Vendor and RMA are required
    const confirmBtn = screen.getByRole('button', { name: 'Confirm & Dispatch' });
    expect(confirmBtn).toBeDisabled();
    
    // But let's say we try to click it (somehow if enabled)
    // Actually the button is disabled by `!isFormValid`.
    // isFormValid = formData.vendorId.trim() !== '' && formData.rmaNumber.trim() !== ''
  });

  it('submits successfully when valid data is entered', async () => {
    renderDialog();
    
    // Select Vendor
    const vendorSelect = screen.getByRole('combobox', { name: /Vendor/i });
    fireEvent.click(vendorSelect);
    const vendorOption = await screen.findByRole('option', { name: 'Vendor A' });
    fireEvent.click(vendorOption);

    // Enter RMA
    const rmaInput = screen.getByLabelText(/RMA \/ Ticket Number/i);
    fireEvent.change(rmaInput, { target: { value: 'RMA-123' } });

    // Enter Cost
    const costInput = screen.getByLabelText(/Estimated Cost/i);
    fireEvent.change(costInput, { target: { value: '150.00' } });

    // Button should be enabled now
    const confirmBtn = screen.getByRole('button', { name: 'Confirm & Dispatch' });
    expect(confirmBtn).not.toBeDisabled();
    
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        vendorId: '1',
        rmaNumber: 'RMA-123',
        estimatedCost: '150.00',
        expectedReturnDate: '',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error if RMA is too short on submit', async () => {
    renderDialog();
    
    const vendorSelect = screen.getByRole('combobox', { name: /Vendor/i });
    fireEvent.click(vendorSelect);
    const vendorOption = await screen.findByRole('option', { name: 'Vendor A' });
    fireEvent.click(vendorOption);

    const rmaInput = screen.getByLabelText(/RMA \/ Ticket Number/i);
    fireEvent.change(rmaInput, { target: { value: 'RM' } }); // length 2

    const confirmBtn = screen.getByRole('button', { name: 'Confirm & Dispatch' });
    expect(confirmBtn).not.toBeDisabled();
    
    fireEvent.click(confirmBtn);

    expect(await screen.findByText('RMA/Ticket Number must be at least 3 characters')).toBeInTheDocument();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
