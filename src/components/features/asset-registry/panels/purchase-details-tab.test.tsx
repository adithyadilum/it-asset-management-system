import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { PurchaseDetailsTab } from './purchase-details-tab';

describe('PurchaseDetailsTab', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders purchase details correctly', () => {
    const mockDetails = {
      currency: 'USD',
      purchaseDate: '2023-01-01',
      basePrice: '2000',
      shippingCost: '0',
      tax: '0',
      totalCost: '2000',
      warrantyPeriod: '1 Year',
      vendor: {
        vendorId: 'v1',
        vendorCode: 'V-001',
        vendorName: 'Apple',
      },
    };
    render(<PurchaseDetailsTab {...(mockDetails as any)} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('hides shipping cost when it is not applicable', () => {
    const mockDetails = {
      currency: 'USD',
      purchaseDate: '2023-01-01',
      basePrice: '2000',
      shippingCost: '100',
      tax: '0',
      totalCost: '2100',
      warrantyPeriod: '1 Year',
      hideShippingCost: true,
      vendor: {
        vendorId: 'v1',
        vendorCode: 'V-001',
        vendorName: 'Apple',
      },
    };

    render(<PurchaseDetailsTab {...(mockDetails as any)} />);
    expect(screen.queryByText('Shipping Cost')).not.toBeInTheDocument();
  });
});
