import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeleteWebhookDialog } from './delete-webhook-dialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('DeleteWebhookDialog', () => {
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
    
    expect(screen.getByText('Delete Webhook')).toBeInTheDocument();
    expect(screen.getByText(/Test Hook/i)).toBeInTheDocument();
  });
});
