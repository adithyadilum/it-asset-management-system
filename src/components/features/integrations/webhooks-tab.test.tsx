import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebhooksTab } from './webhooks-tab';

vi.mock('./webhooks-tab-client', () => ({
  WebhooksTabClient: () => <div data-testid="webhooks-client">Client</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe('WebhooksTab', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<WebhooksTab subscriptions={[]} />);
    expect(screen.getByTestId('webhooks-client')).toBeInTheDocument();
  });
});
