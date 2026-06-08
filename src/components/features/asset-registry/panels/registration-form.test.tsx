import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RegistrationForm } from './registration-form';

describe('RegistrationForm', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    // @ts-ignore
    render(<RegistrationForm isOpen={true} onClose={vi.fn()} categories={[]} locations={[]} users={[]} departments={[]} />);
    expect(screen.getByText(/Asset Registry/i)).toBeInTheDocument();
  });
});
