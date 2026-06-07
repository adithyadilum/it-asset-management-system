import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertsSettingsClient } from './alerts-settings-client';
import { getIntegrationStatus, saveIntegrationSettings, testIntegrationConnection } from '@/actions/notifications';
import { tiqriToast } from '@/components/shared/sonner';

// Mock the actions
vi.mock('@/actions/notifications', () => ({
  getIntegrationStatus: vi.fn(),
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
global.fetch = mockFetch;

// ResizeObserver mock for Radix UI Tooltips
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('AlertsSettingsClient', () => {
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
    (getIntegrationStatus as any).mockResolvedValue({ success: true, data: { isAdmin: false, resendConfigured: false, teamsConfigured: false } });
    
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, data: mockRules }),
    });
  });

  it('renders loading state initially', () => {
    render(<AlertsSettingsClient />);
    expect(screen.queryByText('Alerts & Notifications')).not.toBeInTheDocument();
  });

  it('fetches and renders rules', async () => {
    render(<AlertsSettingsClient />);
    
    await waitFor(() => {
      expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
      expect(screen.getByText('Hardware Lifecycle')).toBeInTheDocument();
      expect(screen.getByText('Warranty Expiration Warning')).toBeInTheDocument(); // CUSTOM_DISPLAY_NAMES overrides
    });
  });

  it('handles rule toggle correctly', async () => {
    mockFetch
      // First call for initial load
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ success: true, data: mockRules }) })
      // Second call for update
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ success: true }) });

    render(<AlertsSettingsClient />);
    
    await waitFor(() => {
      expect(screen.getByText('Warranty Expiration Warning')).toBeInTheDocument();
    });

    const offButton = screen.getByRole('button', { name: 'Off' });
    fireEvent.click(offButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith('/api/v1/settings/notification-rules/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: false,
          thresholdDays: 30,
          channelInApp: true,
          channelEmail: false,
          channelTeams: false,
        }),
      });
      expect(tiqriToast.success).toHaveBeenCalledWith('Alert rule updated successfully');
    });
  });

  it('shows integration settings for admins', async () => {
    (getIntegrationStatus as any).mockResolvedValue({ 
      success: true, 
      data: { isAdmin: true, resendConfigured: true, teamsConfigured: false } 
    });

    render(<AlertsSettingsClient />);
    
    await waitFor(() => {
      expect(screen.getByText('External Service Integrations')).toBeInTheDocument();
    });
    
    // Check if the input is masked for configured resend
    const resendInput = screen.getByPlaceholderText('••••••••');
    expect(resendInput).toBeInTheDocument();
  });

  it('handles testing email connection', async () => {
    (getIntegrationStatus as any).mockResolvedValue({ 
      success: true, 
      data: { isAdmin: true, resendConfigured: false, teamsConfigured: false } 
    });
    (testIntegrationConnection as any).mockResolvedValue({ success: true });

    render(<AlertsSettingsClient />);
    
    await waitFor(() => {
      expect(screen.getByText('External Service Integrations')).toBeInTheDocument();
    });
    
    const resendInput = screen.getByPlaceholderText('re_...');
    fireEvent.change(resendInput, { target: { value: 're_testkey' } });
    
    const testButton = screen.getByRole('button', { name: /Test Connection/i });
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(testIntegrationConnection).toHaveBeenCalledWith('email', { resendApiKey: 're_testkey' });
      expect(tiqriToast.success).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });
  });
});
