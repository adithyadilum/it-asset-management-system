import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StepFileUpload } from './step-file-upload';

describe('StepFileUpload', () => {
  const mockState = {
    step: 1,
    isOpen: true,
    category: 'Laptops',
    file: null,
    isValidating: false,
    previewResult: null,
    isExecuting: false,
    executionResult: null,
  };

  it('renders upload area and disabled validate button', () => {
    const mockDispatch = vi.fn();
    // @ts-ignore
    render(<StepFileUpload state={mockState} dispatch={mockDispatch} />);
    
    expect(screen.getByText(/Drag & drop your file here/i)).toBeInTheDocument();
    
    const validateBtn = screen.getByRole('button', { name: 'Validate' });
    expect(validateBtn).toBeDisabled();
    
    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESET' });
  });
});
