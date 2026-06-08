import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StepPreview } from './step-preview';

describe('StepPreview', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders valid and error counts', () => {
    const mockState = {
      step: 2,
      isOpen: true,
      category: 'Laptops',
      file: null,
      isValidating: false,
      previewResult: {
        validRows: [{ test: 'row' }],
        errorRows: [
          { rowNumber: 2, errorMessage: 'Invalid Name', errorStage: 'TYPE', errorField: 'name' }
        ],
        summary: { skippedEmptyRows: 0 }
      },
      isExecuting: false,
      executionResult: null,
    };
    
    const mockDispatch = vi.fn();
    // @ts-ignore
    render(<StepPreview state={mockState} dispatch={mockDispatch} />);
    
    expect(screen.getByText('Ready to import')).toBeInTheDocument();
    expect(screen.getByText('Invalid Name')).toBeInTheDocument();
    
    const importBtn = screen.getByRole('button', { name: /Import 1 Asset/i });
    expect(importBtn).not.toBeDisabled();
    
    fireEvent.click(importBtn);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'START_EXECUTION' });
  });
});
