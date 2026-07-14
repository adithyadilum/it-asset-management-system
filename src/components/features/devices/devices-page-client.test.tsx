import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevicesPageClient } from './devices-page-client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Pusher from 'pusher-js';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('pusher-js', () => {
  const mockPusher = vi.fn(function (this: any) {
    this.subscribe = vi
      .fn()
      .mockReturnValue({ bind: vi.fn(), unbind: vi.fn() });
    this.unsubscribe = vi.fn();
    this.disconnect = vi.fn();
  });
  return { default: mockPusher };
});

vi.mock('@/components/auth/device-pairing-modal', () => ({
  default: (props: any) => (
    <div data-testid="pairing-modal" data-open={props.open}>
      <button onClick={() => props.onOpenChange(false)}>Close Modal</button>
    </div>
  ),
}));

vi.mock('@/components/features/devices/devices-list', () => ({
  DevicesList: (props: any) => (
    <div data-testid="devices-list">Devices: {props.devices.length}</div>
  ),
}));

describe('DevicesPageClient', () => {
  const mockRouter = { refresh: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (useSession as any).mockReturnValue({ data: { user: { id: 'user-1' } } });
  });

  it('renders correctly', () => {
    render(<DevicesPageClient devices={[]} />);
    expect(screen.getByText('Linked Devices')).toBeInTheDocument();
    expect(screen.getByTestId('devices-list')).toHaveTextContent('Devices: 0');
  });

  it('opens pairing modal when link button is clicked', () => {
    render(<DevicesPageClient devices={[]} />);

    expect(screen.getByTestId('pairing-modal')).toHaveAttribute(
      'data-open',
      'false'
    );

    fireEvent.click(screen.getByRole('button', { name: /Link New Device/i }));

    expect(screen.getByTestId('pairing-modal')).toHaveAttribute(
      'data-open',
      'true'
    );
  });

  it('subscribes to Pusher channel when session exists', () => {
    render(<DevicesPageClient devices={[]} />);
    expect(Pusher).toHaveBeenCalled();
  });
});
