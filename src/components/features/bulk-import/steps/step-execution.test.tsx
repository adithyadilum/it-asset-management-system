import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from '@/components/ui/dialog';
import { describe, it, expect, vi } from 'vitest';
import { StepExecution } from './step-execution';

describe('StepExecution', () => {
  it('renders execution state', () => {
    const mockState = {
      step: 3,
      isOpen: true,
      category: 'Laptops',
      file: null,
      isValidating: false,
      previewResult: null,
      isExecuting: true,
      executionResult: null,
    };
    
    // @ts-ignore
    render(<StepExecution state={mockState} onDone={vi.fn()} />);
    
    expect(screen.getByText(/Importing 0 assets.../i)).toBeInTheDocument();
  });

  it('renders completion state', () => {
    const mockState = {
      step: 3,
      isOpen: true,
      category: 'Laptops',
      file: null,
      isValidating: false,
      previewResult: null,
      isExecuting: false,
      executionResult: { successCount: 5, failedCount: 0, importedAssetTags: [] },
    };
    
    // @ts-ignore
    const mockOnComplete = vi.fn();
    // @ts-ignore
    render(<StepExecution state={mockState as any} onDone={mockOnComplete} />);
    
    expect(screen.getByText(/5 assets imported successfully/i)).toBeInTheDocument();
    
    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
