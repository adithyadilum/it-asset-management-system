import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PurchaseDetailsTab } from './purchase-details-tab';

describe('PurchaseDetailsTab', () => {
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
        vendorName: 'Apple'
      }
    };
    render(<PurchaseDetailsTab {...mockDetails as any} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });
});
