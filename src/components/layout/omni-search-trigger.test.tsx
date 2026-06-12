import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OmniSearchTrigger } from '@/components/layout/omni-search-trigger';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

function mockSearchPayload(overrides?: Partial<Record<string, unknown>>) {
  return {
    query: 'rep',
    assets: [],
    users: [],
    reports: [],
    ...overrides,
  };
}

describe('OmniSearchTrigger', () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => mockSearchPayload(),
      }))
    );
  });

  it('uses a single top search input and opens centered result panel', async () => {
    const user = userEvent.setup();
    render(<OmniSearchTrigger userRole="GlobalAdmin" />);

    const input = screen.getByPlaceholderText('Search...');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);

    await user.click(input);
    expect(
      screen.getByText('Start typing to search pages, assets, reports, and users.')
    ).toBeInTheDocument();

    const popoverContent = screen
      .getByText('Start typing to search pages, assets, reports, and users.')
      .closest('[data-slot="popover-content"]');
    expect(popoverContent).toHaveClass('w-180');
  });

  it('shows section-level empty states with entity-specific messages', async () => {
    const user = userEvent.setup();
    render(<OmniSearchTrigger userRole="GlobalAdmin" />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'zz');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getAllByText('No records found').length).toBeGreaterThanOrEqual(
        4
      );
    });

    expect(
      screen.getByText('Your search "zz" did not match any users.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your search "zz" did not match any assets.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your search "zz" did not match any reports.')
    ).toBeInTheDocument();
  });

  it('renders loading skeleton rows while async search is in-flight', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise(() => {
            // Intentionally pending to verify loading skeleton rendering.
          })
      )
    );

    render(<OmniSearchTrigger userRole="GlobalAdmin" />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'lap');

    await waitFor(() => {
      expect(screen.getAllByTestId('omni-skeleton-row').length).toBeGreaterThan(
        0
      );
    });
  });
});
