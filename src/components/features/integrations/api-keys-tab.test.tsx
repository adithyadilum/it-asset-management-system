import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiKeysTab } from './api-keys-tab';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('./api-key-table', () => ({
  ApiKeyTable: () => <div data-testid="api-key-table">Api Key Table</div>,
}));

vi.mock('./create-api-key-dialog', () => ({
  CreateApiKeyDialog: () => <div data-testid="create-api-key-dialog">Create Api Key Dialog</div>,
}));

vi.mock('./revoke-key-dialog', () => ({
  RevokeKeyDialog: () => <div data-testid="revoke-key-dialog">Revoke Key Dialog</div>,
}));

describe('ApiKeysTab', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockApiKeys: any[] = [
    { id: '1', name: 'Test Key', lastUsedAt: new Date('2023-01-01'), createdAt: new Date('2022-01-01'), prefix: 'test_', permissions: ['read'] },
  ];

  it('renders correctly', () => {
    render(<ApiKeysTab keys={mockApiKeys} />);
    
    expect(screen.getByTestId('api-key-table')).toBeInTheDocument();
    expect(screen.getByTestId('create-api-key-dialog')).toBeInTheDocument();
  });
});
