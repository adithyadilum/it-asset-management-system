import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DeleteWebhookDialog } from './delete-webhook-dialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('DeleteWebhookDialog', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const mockWebhook = { id: '1', name: 'Test Hook', url: 'http://test' };
    render(
      <DeleteWebhookDialog
        open={true}
        onOpenChange={vi.fn()}
        webhookId={mockWebhook.id}
        name={mockWebhook.name}
        url={mockWebhook.url}
      />
    );
    
    expect(screen.getAllByText('Delete Webhook')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Test Hook/i)[0]).toBeInTheDocument();
  });
});
