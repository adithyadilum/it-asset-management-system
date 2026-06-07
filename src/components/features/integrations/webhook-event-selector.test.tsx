import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WebhookEventSelector } from './webhook-event-selector';

describe('WebhookEventSelector', () => {
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
