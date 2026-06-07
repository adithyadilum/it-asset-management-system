import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RegistrationForm } from './registration-form';

describe('RegistrationForm', () => {
  it('renders registration form', () => {
    // @ts-ignore
    render(<RegistrationForm isOpen={true} onClose={vi.fn()} categories={[]} locations={[]} users={[]} departments={[]} />);
    expect(screen.getByText(/Asset Registry/i)).toBeInTheDocument();
  });
});
