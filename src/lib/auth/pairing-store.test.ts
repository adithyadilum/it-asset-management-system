import { expect, it, vi } from 'vitest';
import { createPairingStore, pairingDeviceId } from './pairing-store';
const { constructor } = vi.hoisted(() => ({ constructor: vi.fn() }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(options: unknown) {
      constructor(options);
    }
  },
}));
it('does not replay token consumption and creates a fresh deadline for each command', () => {
  createPairingStore();
  const options = constructor.mock.calls[0][0];
  expect(options.retry).toBe(false);
  expect(options.signal()).not.toBe(options.signal());
});

it('binds each QR to a stable device identifier without retaining its credential', () => {
  const token = 'a'.repeat(64);
  expect(pairingDeviceId(token)).toHaveLength(64);
  expect(pairingDeviceId(token)).not.toBe(token);
  expect(pairingDeviceId(token)).toBe(pairingDeviceId(token));
  expect(pairingDeviceId(token)).not.toBe(pairingDeviceId('b'.repeat(64)));
});
