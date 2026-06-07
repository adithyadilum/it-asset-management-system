import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ApiKeyTable } from './api-key-table';

describe('ApiKeyTable', () => {
  const mockApiKeys: any[] = [
    { id: '1', name: 'Production Key', prefix: 'prod_', lastUsed: '2023-01-01', created: '2022-01-01', permissions: ['read', 'write'] },
  ];

  it('renders api keys correctly', () => {
    render(<ApiKeyTable keys={mockApiKeys} onChanged={vi.fn()} />);
    
    expect(screen.getByText('Production Key')).toBeInTheDocument();
    expect(screen.getByText('prod_••••••••••••')).toBeInTheDocument();
  });
});
