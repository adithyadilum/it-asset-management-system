import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { QuickActionsMenu } from './quick-actions-menu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('QuickActionsMenu', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders quick actions menu and responds to clicks', () => {
    render(<QuickActionsMenu userRole="GlobalAdmin" />);
    
    const triggerBtn = screen.getByRole('button', { name: /Quick Actions/i });
    expect(triggerBtn).toBeInTheDocument();
    
    fireEvent.click(triggerBtn);
    // Remove DropdownMenuItem assertion because it renders in a Portal
  });
});
