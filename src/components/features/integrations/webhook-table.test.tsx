import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebhookTable } from './webhook-table';

describe('WebhookTable', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockWebhooks: any[] = [
    { id: '1', name: 'Slack Integration', url: 'https://hooks.slack.com/...', active: true, events: ['asset.created'], created: '2022-01-01' },
  ];

  it('renders webhooks correctly', () => {
    render(<WebhookTable subscriptions={mockWebhooks} onChanged={vi.fn()} />);
    
    expect(screen.getByText('Slack Integration')).toBeInTheDocument();
    expect(screen.getByText('https://hooks.slack.com/...')).toBeInTheDocument();
  });
});
