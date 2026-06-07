import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BulkImportWizard } from './bulk-import-wizard';

describe('BulkImportWizard', () => {
  it('renders correctly when open', () => {
    const mockCategories = [{ id: 1, name: 'Laptops', pillar: 'IT' }];
    render(<BulkImportWizard isOpen={true} onOpenChange={vi.fn()} categories={mockCategories} />);
    
    expect(screen.getByText('Select Category')).toBeInTheDocument();
    expect(screen.getByText('Choose the asset category to import into.')).toBeInTheDocument();
  });
});
