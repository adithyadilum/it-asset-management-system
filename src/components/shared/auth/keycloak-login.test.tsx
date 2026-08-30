import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeycloakLogin } from './keycloak-login';
import { signIn } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// redirectTo is now read from the URL on the client, so the page itself can
// stay static.
const mockSearchParams = vi.fn(() => new URLSearchParams());
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams(),
}));

describe('KeycloakLogin', () => {
  beforeEach(() => {
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('renders login screen correctly', () => {
    render(<KeycloakLogin />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in with microsoft/i })
    ).toBeInTheDocument();
  });

  it('calls signIn when button is clicked and shows processing state', async () => {
    const user = userEvent.setup();
    render(<KeycloakLogin />);

    const button = screen.getByRole('button', {
      name: /sign in with microsoft/i,
    });
    await user.click(button);

    expect(signIn).toHaveBeenCalledWith('keycloak', {
      callbackUrl: '/dashboard',
    });
    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
  });

  it('shows error message if signIn throws synchronously', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    render(<KeycloakLogin />);
    const button = screen.getByRole('button', {
      name: /sign in with microsoft/i,
    });
    await user.click(button);

    expect(
      screen.getByText('An unexpected error occurred. Please try again.')
    ).toBeInTheDocument();
  });

  it('sends the caller to the sanitized redirectTo from the URL', async () => {
    const user = userEvent.setup();
    mockSearchParams.mockReturnValue(
      new URLSearchParams({ redirectTo: '/operations/assignments' })
    );

    render(<KeycloakLogin />);
    await user.click(
      screen.getByRole('button', { name: /sign in with microsoft/i })
    );

    expect(signIn).toHaveBeenCalledWith('keycloak', {
      callbackUrl: '/operations/assignments',
    });
  });

  it('refuses an off-site redirectTo', async () => {
    // The sanitising moved to the client with the read; it still has to reject
    // protocol-relative and absolute targets.
    const user = userEvent.setup();
    mockSearchParams.mockReturnValue(
      new URLSearchParams({ redirectTo: '//evil.example.com' })
    );

    render(<KeycloakLogin />);
    await user.click(
      screen.getByRole('button', { name: /sign in with microsoft/i })
    );

    expect(signIn).toHaveBeenCalledWith('keycloak', {
      callbackUrl: '/dashboard',
    });
  });

  it('refuses a redirect back to /login', async () => {
    const user = userEvent.setup();
    mockSearchParams.mockReturnValue(
      new URLSearchParams({ redirectTo: '/login' })
    );

    render(<KeycloakLogin />);
    await user.click(
      screen.getByRole('button', { name: /sign in with microsoft/i })
    );

    expect(signIn).toHaveBeenCalledWith('keycloak', {
      callbackUrl: '/dashboard',
    });
  });
});
