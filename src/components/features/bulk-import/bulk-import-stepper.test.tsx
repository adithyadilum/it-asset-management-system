import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BulkImportStepper } from './bulk-import-stepper';

describe('BulkImportStepper', () => {
  it('renders all steps', () => {
    // @ts-ignore
    render(<BulkImportStepper currentStep={0} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
