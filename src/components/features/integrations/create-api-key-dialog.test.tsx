import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateApiKeyDialog } from './create-api-key-dialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() })
}));

describe('CreateApiKeyDialog', () => {
  it('renders correctly', () => {
    render(<CreateApiKeyDialog onCreated={vi.fn()} />);
    
    expect(screen.getByText('Create New API Key')).toBeInTheDocument();
  });

  it('validates empty name', async () => {
    render(<CreateApiKeyDialog onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create Key' }));
    
    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
  });
});
