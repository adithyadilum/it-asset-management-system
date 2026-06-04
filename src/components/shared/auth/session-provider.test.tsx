import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextAuthSessionProvider } from './session-provider';

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>,
}));

describe('NextAuthSessionProvider', () => {
  it('renders children wrapped in SessionProvider', () => {
    const { getByTestId, getByText } = render(
      <NextAuthSessionProvider>
        <div>Test Child</div>
      </NextAuthSessionProvider>
    );

    expect(getByTestId('session-provider')).toBeInTheDocument();
    expect(getByText('Test Child')).toBeInTheDocument();
  });
});
