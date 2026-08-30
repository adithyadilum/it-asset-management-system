import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CreateWebhookDialog } from './create-webhook-dialog';

vi.mock('./webhook-event-selector', () => ({
  WebhookEventSelector: () => <div data-testid="event-selector">Events</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { tiqriToast } from '@/components/shared/sonner';

describe('CreateWebhookDialog', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <CreateWebhookDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByText('Configure Webhook')).toBeInTheDocument();
    expect(screen.getByTestId('event-selector')).toBeInTheDocument();
  });

  it('validates empty fields', async () => {
    render(
      <CreateWebhookDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Webhook' }));

    expect(tiqriToast.warning).toHaveBeenCalledWith('Webhook name is required');
  });
});
