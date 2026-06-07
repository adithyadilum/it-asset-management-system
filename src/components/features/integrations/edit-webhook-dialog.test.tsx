import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditWebhookDialog } from './edit-webhook-dialog';

vi.mock('./webhook-event-selector', () => ({
  WebhookEventSelector: () => <div data-testid="event-selector">Events</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('EditWebhookDialog', () => {
  it('renders correctly', () => {
    render(
      <EditWebhookDialog
        open={true}
        onOpenChange={vi.fn()}
        subscription={{ id: '1', name: 'Test Hook', url: 'http://test', isActive: true, events: [], createdAt: '', updatedAt: '', createdByName: '' } as any}
      />
    );
    
    expect(screen.getByText('Configure Webhook')).toBeInTheDocument();
  });
});
