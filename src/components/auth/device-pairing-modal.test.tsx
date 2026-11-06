import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import DevicePairingModal from './device-pairing-modal';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="pairing-qr" />,
}));
afterEach(() => vi.unstubAllGlobals());
it('distinguishes an unavailable pairing service from an expired QR and lets the user retry', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'a'.repeat(64), expires_in: 60 }),
    });
  vi.stubGlobal('fetch', fetch);
  render(<DevicePairingModal open onOpenChange={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to generate a pairing code'
  );
  expect(screen.queryByText('Code Expired')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() =>
    expect(screen.getByTestId('pairing-qr')).toBeInTheDocument()
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
