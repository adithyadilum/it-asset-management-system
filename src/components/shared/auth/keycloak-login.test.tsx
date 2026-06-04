import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { KeycloakLogin } from './keycloak-login';
import { signIn } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

describe('KeycloakLogin', () => {
  it('renders login screen correctly', () => {
    render(<KeycloakLogin redirectTo="/dashboard" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument();
  });

  it('calls signIn when button is clicked and shows processing state', async () => {
    const user = userEvent.setup();
    render(<KeycloakLogin redirectTo="/dashboard" />);
    
    const button = screen.getByRole('button', { name: /sign in with microsoft/i });
    await user.click(button);
    
    expect(signIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/dashboard' });
    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
  });

  it('shows error message if signIn throws synchronously', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    render(<KeycloakLogin redirectTo="/dashboard" />);
    const button = screen.getByRole('button', { name: /sign in with microsoft/i });
    await user.click(button);

    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });
});
