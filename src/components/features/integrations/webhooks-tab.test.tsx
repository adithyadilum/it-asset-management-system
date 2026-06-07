import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WebhooksTab } from './webhooks-tab';

vi.mock('./webhooks-tab-client', () => ({
  WebhooksTabClient: () => <div data-testid="webhooks-client">Client</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('WebhooksTab', () => {
  it('renders correctly', () => {
    render(<WebhooksTab subscriptions={[]} />);
    expect(screen.getByTestId('webhooks-client')).toBeInTheDocument();
  });
});
