import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebhookEventSelector } from './webhook-event-selector';

describe('WebhookEventSelector', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <WebhookEventSelector
        selectedEvents={['asset.created']}
        onSelectedEventsChange={vi.fn()}
      />
    );

    expect(screen.getByText('Asset Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Assignments')).toBeInTheDocument();
  });
});
