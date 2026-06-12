import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebhooksTabClient } from './webhooks-tab-client';

vi.mock('./webhook-table', () => ({
  WebhookTable: () => <div data-testid="webhook-table">Webhook Table</div>,
}));

vi.mock('./create-webhook-dialog', () => ({
  CreateWebhookDialog: () => <div data-testid="create-webhook-dialog">Create Webhook Dialog</div>,
}));

vi.mock('./edit-webhook-dialog', () => ({
  EditWebhookDialog: () => <div data-testid="edit-webhook-dialog">Edit Webhook Dialog</div>,
}));

vi.mock('./delete-webhook-dialog', () => ({
  DeleteWebhookDialog: () => <div data-testid="delete-webhook-dialog">Delete Webhook Dialog</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('WebhooksTabClient', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<WebhooksTabClient subscriptions={[]} />);
    
    expect(screen.getByText(/Create a webhook subscription/i)).toBeInTheDocument();
    expect(screen.getByTestId('create-webhook-dialog')).toBeInTheDocument();
  });
});
