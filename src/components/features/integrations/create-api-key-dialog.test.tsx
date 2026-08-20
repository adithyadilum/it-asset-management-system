import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CreateApiKeyDialog } from './create-api-key-dialog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { tiqriToast } from '@/components/shared/sonner';

describe('CreateApiKeyDialog', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<CreateApiKeyDialog onCreated={vi.fn()} />);

    expect(screen.getAllByText('Create API Key')[0]).toBeInTheDocument();
  });

  it('validates empty name', async () => {
    render(<CreateApiKeyDialog onCreated={vi.fn()} />);

    // First we need to open the dialog since it is uncontrolled internally
    const triggers = screen.getAllByRole('button', { name: /Create API Key/i });
    fireEvent.click(triggers[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(tiqriToast.warning).toHaveBeenCalledWith('Name is required');
  });
});
