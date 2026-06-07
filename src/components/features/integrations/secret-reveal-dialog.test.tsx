import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SecretRevealDialog } from './secret-reveal-dialog';

// Use basic mocks for navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

describe('SecretRevealDialog', () => {
  it('renders correctly', () => {
    render(
      <SecretRevealDialog 
        open={true} 
        onOpenChange={vi.fn()} 
        secret="test_secret_key" 
      />
    );
    
    expect(screen.getByText(/API Key - Copy & Store Securely/i)).toBeInTheDocument();
  });
});
