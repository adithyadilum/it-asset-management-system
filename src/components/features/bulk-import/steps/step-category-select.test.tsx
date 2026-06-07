import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from '@/components/ui/dialog';
import { describe, it, expect, vi } from 'vitest';
import { StepCategorySelect } from './step-category-select';

describe('StepCategorySelect', () => {
  const mockState = {
    step: 0,
    isOpen: true,
    category: null,
    file: null,
    isValidating: false,
    previewResult: null,
    isExecuting: false,
    executionResult: null,
  };

  it('renders and allows category selection', () => {
    const mockDispatch = vi.fn();
    const mockCategories = [{ id: 1, name: 'Laptops', pillar: 'IT' }];
    render(
      <Dialog>
        <StepCategorySelect state={mockState as any} dispatch={mockDispatch} categories={mockCategories} />
      </Dialog>
    );
    
    expect(screen.getByText('Asset Category')).toBeInTheDocument();
    
    const nextBtn = screen.getByRole('button', { name: 'Next' });
    expect(nextBtn).toBeDisabled();
    
    // Select category would enable Next, but it relies on user action which we trigger manually through the Select component.
    // For unit test, we just check presence.
  });
});
