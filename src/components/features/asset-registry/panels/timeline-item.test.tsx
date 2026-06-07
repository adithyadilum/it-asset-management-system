import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TimelineItem } from './timeline-item';

describe('TimelineItem', () => {
  it('renders timeline item', () => {
    render(
      <TimelineItem 
        title="Created" 
        description="Asset was created" 
    // @ts-ignore
        date="2023-01-01" 
        isLast={false} 
      />
    );
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Asset was created')).toBeInTheDocument();
  });
});
