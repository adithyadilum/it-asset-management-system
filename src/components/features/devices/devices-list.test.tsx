import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevicesList } from './devices-list';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the tiqriToast
vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DevicesList', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockRouter = { refresh: vi.fn() };

  const mockDevices = [
    {
      id: 'device-1',
      deviceName: 'My iPhone',
      deviceModel: 'iPhone 13',
      deviceOs: 'iOS',
      lastActiveAt: new Date().toISOString(),
      linkedAt: new Date().toISOString(),
    },
    {
      id: 'device-2',
      deviceName: 'My Android Tablet',
      deviceModel: 'Galaxy Tab',
      deviceOs: 'Android',
      lastActiveAt: null,
      linkedAt: new Date().toISOString(),
    }
  ] as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders empty state when no devices', () => {
    render(<DevicesList devices={[]} />);
    expect(screen.getByText('No Linked Devices')).toBeInTheDocument();
  });

  it('renders list of devices', () => {
    render(<DevicesList devices={mockDevices} />);
    expect(screen.getByText('My iPhone')).toBeInTheDocument();
    expect(screen.getByText('My Android Tablet')).toBeInTheDocument();
  });

  it('unlinks a device successfully', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true });
    
    render(<DevicesList devices={mockDevices} />);
    
    // Click unlink on first device
    const unlinkBtns = screen.getAllByRole('button', { name: /Unlink Device/i });
    fireEvent.click(unlinkBtns[0]);
    
    // Confirm dialog
    const confirmBtn = screen.getByRole('button', { name: /^Unlink Device$/ }); // exact match for dialog btn
    fireEvent.click(confirmBtn);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/unlink-device', expect.any(Object));
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('handles unlink failure', async () => {
    (global.fetch as any).mockResolvedValue({ 
      ok: false, 
      json: () => Promise.resolve({ error: 'Failed to unlink' }) 
    });
    
    render(<DevicesList devices={mockDevices} />);
    
    // Click unlink on first device
    const unlinkBtns = screen.getAllByRole('button', { name: /Unlink Device/i });
    fireEvent.click(unlinkBtns[0]);
    
    // Confirm dialog
    const confirmBtn = screen.getByRole('button', { name: /^Unlink Device$/ });
    fireEvent.click(confirmBtn);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
