import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { AlertsSettingsClient } from './alerts-settings-client';
import { testIntegrationConnection } from '@/actions/notifications';
import { tiqriToast } from '@/components/shared/sonner';

// Mock the actions
vi.mock('@/actions/notifications', () => ({
  saveIntegrationSettings: vi.fn(),
  testIntegrationConnection: vi.fn(),
}));

// Mock the toast
vi.mock('@/components/shared/sonner', () => ({
  tiqriToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ResizeObserver mock for Radix UI Tooltips
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

describe('AlertsSettingsClient', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockRules = [
    {
      id: 1,
      ruleKey: 'WARRANTY_EXPIRY_WARNING',
      displayName: 'Warranty Expiration',
      category: 'HARDWARE_LIFECYCLE',
      isEnabled: true,
      thresholdDays: 30,
      channelInApp: true,
      channelEmail: false,
      channelTeams: false,
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, data: mockRules }),
    });
  });

  const renderClient = ({
    rules = mockRules,
    isAdmin = false,
    resendConfigured = false,
    teamsConfigured = false,
  } = {}) =>
    render(
      <AlertsSettingsClient
        initialRules={rules as any}
        initialIntegrations={{ resendConfigured, teamsConfigured }}
        initialIsAdmin={isAdmin}
      />
    );

  it('renders loading state initially', () => {
    renderClient({ rules: [] });
    expect(
      screen.queryByText('Alerts & Notifications')
    ).not.toBeInTheDocument();
  });

  it('fetches and renders rules', async () => {
    renderClient({ rules: [] });

    await waitFor(() => {
      expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
      expect(screen.getByText('Hardware Lifecycle')).toBeInTheDocument();
      expect(
        screen.getByText('Warranty Expiration Warning')
      ).toBeInTheDocument(); // CUSTOM_DISPLAY_NAMES overrides
    });
  });

  it('reuses server-rendered settings without bootstrap requests', () => {
    renderClient();

    expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles rule toggle correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    renderClient();

    await waitFor(() => {
      expect(
        screen.getByText('Warranty Expiration Warning')
      ).toBeInTheDocument();
    });

    const offButton = screen.getByRole('button', { name: 'Off' });
    fireEvent.click(offButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/v1/settings/notification-rules/1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isEnabled: false,
            thresholdDays: 30,
            channelInApp: true,
            channelEmail: false,
            channelTeams: false,
          }),
        }
      );
      expect(tiqriToast.success).toHaveBeenCalledWith(
        'Alert rule updated successfully'
      );
    });
  });

  it('shows integration settings for admins', async () => {
    renderClient({ isAdmin: true, resendConfigured: true });

    await waitFor(() => {
      expect(
        screen.getByText('External Service Integrations')
      ).toBeInTheDocument();
    });

    // Check if the input is masked for configured resend
    const resendInput = screen.getByPlaceholderText('••••••••');
    expect(resendInput).toBeInTheDocument();
  });

  it('handles testing email connection', async () => {
    (testIntegrationConnection as any).mockResolvedValue({ success: true });

    renderClient({ isAdmin: true });

    await waitFor(() => {
      expect(
        screen.getByText('External Service Integrations')
      ).toBeInTheDocument();
    });

    const resendInput = screen.getByPlaceholderText('re_...');
    fireEvent.change(resendInput, { target: { value: 're_testkey' } });

    const testButton = screen.getByRole('button', { name: /Test Connection/i });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(testIntegrationConnection).toHaveBeenCalledWith('email', {
        resendApiKey: 're_testkey',
      });
      expect(tiqriToast.success).toHaveBeenCalledWith(
        expect.stringContaining('successfully')
      );
    });
  });
});
