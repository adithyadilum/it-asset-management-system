import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextAuthSessionProvider } from './session-provider';

const sessionProviderProps = vi.fn();

vi.mock('next-auth/react', () => ({
  SessionProvider: (props: {
    children: React.ReactNode;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
  }) => {
    sessionProviderProps(props);
    return <div data-testid="session-provider">{props.children}</div>;
  },
}));

function renderProvider() {
  sessionProviderProps.mockClear();
  return render(
    <NextAuthSessionProvider>
      <div>Test Child</div>
    </NextAuthSessionProvider>
  );
}

describe('NextAuthSessionProvider', () => {
  it('renders children wrapped in SessionProvider', () => {
    const { getByTestId, getByText } = renderProvider();

    expect(getByTestId('session-provider')).toBeInTheDocument();
    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('polls the session endpoint often enough to keep the cookie rotating', () => {
    // `/api/auth/session` is the only route that writes a rotated session
    // cookie back to the browser, so with no interval the cookie only advanced
    // on mount and on tab focus. The poll must land inside Keycloak's default
    // five-minute access-token lifetime, or the refresh happens on a server
    // render that cannot persist the result.
    renderProvider();

    const { refetchInterval } = sessionProviderProps.mock.calls[0][0];
    expect(refetchInterval).toBeGreaterThan(0);
    expect(refetchInterval).toBeLessThan(5 * 60);
  });

  it('still refetches when the tab regains focus', () => {
    renderProvider();

    expect(sessionProviderProps.mock.calls[0][0].refetchOnWindowFocus).toBe(
      true
    );
  });
});
