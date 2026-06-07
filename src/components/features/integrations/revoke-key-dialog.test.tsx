import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RevokeKeyDialog } from './revoke-key-dialog';

describe('RevokeKeyDialog', () => {
  it('renders correctly', () => {
    const mockKey = { id: '1', name: 'Test Key', prefix: 'test_', permissions: [], lastUsed: '', created: '' };
    render(
      <RevokeKeyDialog
        open={true}
        onOpenChange={vi.fn()}
        keyId={mockKey.id}
        keyName={mockKey.name}
      />
    );
    
    expect(screen.getByText('Revoke API Key')).toBeInTheDocument();
    expect(screen.getByText(/Test Key/i)).toBeInTheDocument();
  });
});
