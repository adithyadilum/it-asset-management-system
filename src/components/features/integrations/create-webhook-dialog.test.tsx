import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateWebhookDialog } from './create-webhook-dialog';

vi.mock('./webhook-event-selector', () => ({
  WebhookEventSelector: () => <div data-testid="event-selector">Events</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('CreateWebhookDialog', () => {
  it('renders correctly', () => {
    render(<CreateWebhookDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    
    expect(screen.getByText('Add Webhook')).toBeInTheDocument();
    expect(screen.getByTestId('event-selector')).toBeInTheDocument();
  });

  it('validates empty fields', async () => {
    render(<CreateWebhookDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Webhook' }));
    
    expect(await screen.findByText(/URL is required/i)).toBeInTheDocument();
  });
});
