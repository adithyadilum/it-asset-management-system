import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopyableField } from './copyable-field';
import { tiqriToast } from '@/components/shared/sonner';

vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn() },
  writable: true,
  configurable: true,
});

describe('CopyableField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders masked value by default', () => {
    render(<CopyableField value="1234567890" />);
    expect(screen.getByText('....7890')).toBeInTheDocument();
  });

  it('toggles visibility when eye icon is clicked', async () => {
    const user = userEvent.setup();
    render(<CopyableField value="1234567890" />);
    
    const toggleButton = screen.getByTitle('Show');
    await user.click(toggleButton);
    
    expect(screen.getByText('1234 5678 90')).toBeInTheDocument();

    const hideButton = screen.getByTitle('Hide');
    await user.click(hideButton);

    expect(screen.getByText('....7890')).toBeInTheDocument();
  });

  it('copies the raw value to clipboard on copy click', async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<CopyableField value="1234567890" label="Test ID" />);
    
    const copyButton = screen.getByTitle('Copy to clipboard');
    await user.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('1234567890');
      expect(tiqriToast.success).toHaveBeenCalledWith('Test ID copied to clipboard');
    });
  });

  it('handles clipboard error', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Clipboard error'));
    
    render(<CopyableField value="1234" />);
    
    const copyButton = screen.getByTitle('Copy to clipboard');
    await user.click(copyButton);

    await waitFor(() => {
      expect(tiqriToast.error).toHaveBeenCalledWith('Failed to copy to clipboard');
    });
  });
});
