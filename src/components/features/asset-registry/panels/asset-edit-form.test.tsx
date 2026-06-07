import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssetEditForm } from './asset-edit-form';

describe('AssetEditForm', () => {
  it('renders edit form', () => {
    const mockData = {
      asset: { id: '1', assetTag: 'AST-1', name: 'MacBook Pro', status: 'Available', condition: 'New' },
      model: { id: 'm1', name: 'MacBook Pro', category: { pillar: 'IT', name: 'Laptops' }, brand: { name: 'Apple' } },
      customFields: [],
      purchaseDetails: { vendor: 'Apple', cost: 2000, currency: 'USD' }
    };
    render(<AssetEditForm isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} data={mockData as any} locationOptions={[]} ownerOptions={[]} />);
    expect(screen.getByText(/Edit Asset/i)).toBeInTheDocument();
  });
});
