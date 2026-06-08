import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiKeyTable } from './api-key-table';

describe('ApiKeyTable', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockApiKeys: any[] = [
    { id: '1', name: 'Production Key', keyPrefix: 'prod_', keySuffix: 'a1b2', lastUsedAt: new Date('2023-01-01'), createdAt: new Date('2022-01-01'), permissions: ['read', 'write'] },
  ];

  it('renders api keys correctly', () => {
    render(<ApiKeyTable keys={mockApiKeys} onChanged={vi.fn()} />);
    
    expect(screen.getByText('Production Key')).toBeInTheDocument();
    expect(screen.getByText('prod_****************a1b2')).toBeInTheDocument();
  });
});
