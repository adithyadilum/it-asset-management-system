import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RegistrationSuccessDialog } from './registration-success-dialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('RegistrationSuccessDialog', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders success dialog', () => {
    render(
      <RegistrationSuccessDialog
        isOpen={true}
        onOpenChange={vi.fn()}
        assetId="1"
        modelName="Laptop"
      />
    );

    expect(
      screen.getByText(/Asset Registered Successfully/i)
    ).toBeInTheDocument();
  });
});
